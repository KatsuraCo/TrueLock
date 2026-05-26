import 'dart:typed_data';

import 'package:test/test.dart';
import 'package:truelock_open_core/truelock_open_core.dart';

void main() {
  final codec = PasswordCapsuleCodec();
  final capsule = PasswordCapsule(
    id: 'demo-001',
    title: 'Private note',
    message: 'Meet at 18:00.',
    createdAt: DateTime.utc(2026, 5, 26, 10, 30),
  );
  final salt = Uint8List.fromList(List<int>.generate(32, (i) => i));
  final dataKey = Uint8List.fromList(List<int>.generate(32, (i) => 64 + i));
  final bodyNonce = Uint8List.fromList(List<int>.generate(12, (i) => i + 1));
  final envelopeNonce = Uint8List.fromList(
    List<int>.generate(12, (i) => 255 - i),
  );

  Future<Uint8List> encrypted() => codec.encrypt(
        capsule: capsule,
        password: 'Correct-Horse-Battery-Staple-2026',
        saltOverride: salt,
        dataKeyOverride: dataKey,
        bodyNonceOverride: bodyNonce,
        envelopeNonceOverride: envelopeNonce,
      );

  test('creates and opens a deterministic password capsule', () async {
    final first = await encrypted();
    final second = await encrypted();

    expect(first, orderedEquals(second));
    final header = codec.readPublicHeader(first);
    expect(header['v'], 2);
    expect(header['suite'], 'aes-256-gcm');
    expect(
      (header['envelopes'] as Map<String, dynamic>)['password'],
      isNotNull,
    );

    final restored = await codec.decrypt(
      bytes: first,
      password: 'Correct-Horse-Battery-Staple-2026',
    );
    expect(restored.id, capsule.id);
    expect(restored.title, capsule.title);
    expect(restored.message, capsule.message);
    expect(restored.createdAt, capsule.createdAt);
  });

  test('rejects a wrong password', () async {
    final bytes = await encrypted();

    expect(
      () => codec.decrypt(bytes: bytes, password: 'wrong-password'),
      throwsA(anything),
    );
  });

  test('rejects modified ciphertext', () async {
    final bytes = await encrypted();
    bytes[bytes.length - 1] ^= 1;

    expect(
      () => codec.decrypt(
        bytes: bytes,
        password: 'Correct-Horse-Battery-Staple-2026',
      ),
      throwsA(anything),
    );
  });
}
