import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

class PasswordCapsule {
  const PasswordCapsule({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
}

class PasswordCapsuleCodec {
  PasswordCapsuleCodec({Random? random}) : _random = random ?? Random.secure();

  static const String fileMagic = 'CFCAPS1';
  static const String payloadMagic = 'CFCPLD1';
  static const int nonceLength = 12;
  static const int macLength = 16;
  static const int saltLength = 32;
  static const int keyLength = 32;

  final Random _random;
  final AesGcm _aes = AesGcm.with256bits();

  Future<Uint8List> encrypt({
    required PasswordCapsule capsule,
    required String password,
    Uint8List? saltOverride,
    Uint8List? dataKeyOverride,
    Uint8List? bodyNonceOverride,
    Uint8List? envelopeNonceOverride,
  }) async {
    final cleanPassword = password.trim();
    if (cleanPassword.isEmpty) {
      throw ArgumentError.value(password, 'password', 'Must not be empty.');
    }

    final salt = saltOverride ?? _randomBytes(saltLength);
    final dataKey = dataKeyOverride ?? _randomBytes(keyLength);
    final bodyNonce = bodyNonceOverride ?? _randomBytes(nonceLength);
    final envelopeNonce = envelopeNonceOverride ?? _randomBytes(nonceLength);
    _requireLength(salt, saltLength, 'salt');
    _requireLength(dataKey, keyLength, 'dataKey');
    _requireLength(bodyNonce, nonceLength, 'bodyNonce');
    _requireLength(envelopeNonce, nonceLength, 'envelopeNonce');

    final passwordKey = await _derivePasswordKey(cleanPassword, salt);
    final envelope = await _aes.encrypt(
      dataKey,
      secretKey: passwordKey,
      nonce: envelopeNonce,
    );
    final body = await _aes.encrypt(
      _encodePayload(capsule),
      secretKey: SecretKey(dataKey),
      nonce: bodyNonce,
    );

    final header = <String, dynamic>{
      'v': 2,
      'suite': 'aes-256-gcm',
      'mode': 'or',
      'envelopes': {
        'password': {
          'nonce': base64Encode(envelope.nonce),
          'mac': base64Encode(envelope.mac.bytes),
          'cipherText': base64Encode(envelope.cipherText),
          'salt': base64Encode(salt),
        },
      },
      'createdAt': capsule.createdAt.toUtc().toIso8601String(),
      'title': capsule.title,
      'showUnlockTimer': false,
      'wm': 'TrueLock',
      'wmv': 1,
    };
    final headerBytes = utf8.encode('$fileMagic ${jsonEncode(header)}\n');
    return _join([headerBytes, body.nonce, body.mac.bytes, body.cipherText]);
  }

  Future<PasswordCapsule> decrypt({
    required Uint8List bytes,
    required String password,
  }) async {
    final parsed = _readContainer(bytes);
    final header = parsed.header;
    if (header['v'] != 2 || header['suite'] != 'aes-256-gcm') {
      throw const FormatException('Unsupported capsule profile.');
    }
    final envelopes = header['envelopes'];
    if (envelopes is! Map<String, dynamic> ||
        envelopes['password'] is! Map<String, dynamic>) {
      throw const FormatException('Password envelope is missing.');
    }
    final passwordEnvelope = envelopes['password'] as Map<String, dynamic>;
    final salt = _decodeRequired(passwordEnvelope, 'salt', saltLength);
    final nonce = _decodeRequired(passwordEnvelope, 'nonce', nonceLength);
    final mac = _decodeRequired(passwordEnvelope, 'mac', macLength);
    final cipherText = _decodeRequired(passwordEnvelope, 'cipherText');

    final passwordKey = await _derivePasswordKey(password.trim(), salt);
    final dataKey = await _aes.decrypt(
      SecretBox(cipherText, nonce: nonce, mac: Mac(mac)),
      secretKey: passwordKey,
    );
    _requireLength(dataKey, keyLength, 'unwrappedDataKey');

    final payload = await _aes.decrypt(
      SecretBox(parsed.cipherText, nonce: parsed.nonce, mac: Mac(parsed.mac)),
      secretKey: SecretKey(dataKey),
    );
    return _decodePayload(Uint8List.fromList(payload));
  }

  Map<String, dynamic> readPublicHeader(Uint8List bytes) =>
      _readContainer(bytes).header;

  Future<SecretKey> _derivePasswordKey(String password, Uint8List salt) {
    if (password.isEmpty) {
      throw ArgumentError.value(password, 'password', 'Must not be empty.');
    }
    return Argon2id(
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      hashLength: keyLength,
    ).deriveKey(secretKey: SecretKey(utf8.encode(password)), nonce: salt);
  }

  Uint8List _encodePayload(PasswordCapsule capsule) {
    final metadata = utf8.encode(
      jsonEncode({
        'id': capsule.id,
        'title': capsule.title,
        'createdAt': capsule.createdAt.toUtc().toIso8601String(),
        'message': capsule.message,
        'attachmentsAccess': 'standard',
        'visualType': null,
      }),
    );
    return _join([
      Uint8List.fromList(utf8.encode(payloadMagic)),
      _u32(metadata.length),
      Uint8List.fromList(metadata),
      _u16(0),
    ]);
  }

  PasswordCapsule _decodePayload(Uint8List payload) {
    final magic = utf8.encode(payloadMagic);
    if (payload.length < magic.length + 6 ||
        !_sameBytes(payload.sublist(0, magic.length), magic)) {
      throw const FormatException('Invalid payload magic.');
    }
    var offset = magic.length;
    final metadataLength = _readU32(payload, offset);
    offset += 4;
    if (metadataLength < 0 || offset + metadataLength + 2 > payload.length) {
      throw const FormatException('Invalid payload metadata length.');
    }
    final metadata = jsonDecode(
      utf8.decode(payload.sublist(offset, offset + metadataLength)),
    ) as Map<String, dynamic>;
    offset += metadataLength;
    final attachments = _readU16(payload, offset);
    if (attachments != 0) {
      throw const FormatException(
        'Reference codec accepts message-only payloads.',
      );
    }
    return PasswordCapsule(
      id: metadata['id'] as String,
      title: metadata['title'] as String,
      message: metadata['message'] as String,
      createdAt: DateTime.parse(metadata['createdAt'] as String),
    );
  }

  _ParsedContainer _readContainer(Uint8List bytes) {
    final newline = bytes.indexOf(10);
    if (newline <= fileMagic.length + 1) {
      throw const FormatException('Capsule header is missing.');
    }
    final line = utf8.decode(bytes.sublist(0, newline));
    final prefix = '$fileMagic ';
    if (!line.startsWith(prefix)) {
      throw const FormatException('Invalid capsule magic.');
    }
    final header = jsonDecode(line.substring(prefix.length));
    if (header is! Map<String, dynamic>) {
      throw const FormatException('Invalid capsule header.');
    }
    final body = bytes.sublist(newline + 1);
    if (body.length < nonceLength + macLength) {
      throw const FormatException('Encrypted body is truncated.');
    }
    return _ParsedContainer(
      header: header,
      nonce: Uint8List.fromList(body.sublist(0, nonceLength)),
      mac: Uint8List.fromList(
        body.sublist(nonceLength, nonceLength + macLength),
      ),
      cipherText: Uint8List.fromList(body.sublist(nonceLength + macLength)),
    );
  }

  Uint8List _decodeRequired(
    Map<String, dynamic> map,
    String key, [
    int? length,
  ]) {
    final value = map[key];
    if (value is! String) {
      throw FormatException('Envelope field $key is missing.');
    }
    final decoded = Uint8List.fromList(base64Decode(value));
    if (length != null) {
      _requireLength(decoded, length, key);
    }
    return decoded;
  }

  Uint8List _randomBytes(int length) => Uint8List.fromList(
        List<int>.generate(length, (_) => _random.nextInt(256)),
      );

  static void _requireLength(List<int> value, int length, String name) {
    if (value.length != length) {
      throw ArgumentError('$name must contain $length bytes.');
    }
  }

  static Uint8List _join(List<List<int>> chunks) {
    final builder = BytesBuilder(copy: false);
    for (final chunk in chunks) {
      builder.add(chunk);
    }
    return builder.toBytes();
  }

  static Uint8List _u16(int value) =>
      Uint8List(2)..buffer.asByteData().setUint16(0, value);

  static Uint8List _u32(int value) =>
      Uint8List(4)..buffer.asByteData().setUint32(0, value);

  static int _readU16(Uint8List bytes, int offset) =>
      bytes.buffer.asByteData(bytes.offsetInBytes).getUint16(offset);

  static int _readU32(Uint8List bytes, int offset) =>
      bytes.buffer.asByteData(bytes.offsetInBytes).getUint32(offset);

  static bool _sameBytes(List<int> left, List<int> right) {
    if (left.length != right.length) {
      return false;
    }
    for (var i = 0; i < left.length; i++) {
      if (left[i] != right[i]) {
        return false;
      }
    }
    return true;
  }
}

class _ParsedContainer {
  const _ParsedContainer({
    required this.header,
    required this.nonce,
    required this.mac,
    required this.cipherText,
  });

  final Map<String, dynamic> header;
  final Uint8List nonce;
  final Uint8List mac;
  final Uint8List cipherText;
}
