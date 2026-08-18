import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { basename, extname } from 'path';

/**
 * 이미지 포맷은 파일 맨 앞 몇 바이트가 고정돼 있다. 이걸 매직 넘버라고 한다.
 *
 * 확장자(.png)나 Content-Type 헤더는 클라이언트가 마음대로 지어낼 수 있지만
 * 이 바이트는 파일 내용 그 자체라서, 위조하려면 진짜 그 포맷이어야 한다.
 * 그래서 업로드 검증은 이름이 아니라 여기를 봐야 한다.
 */
const IMAGE_SIGNATURES = [
  {
    mime: 'image/jpeg',
    ext: 'jpeg',
    // FF D8 FF — 모든 JPEG가 이 3바이트로 시작한다.
    matches: (buffer: Buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    // 89 "PNG" 0D 0A 1A 0A — 8바이트 전체가 정확히 일치해야 한다.
    // 버퍼가 8바이트보다 짧으면 equals가 알아서 false를 낸다.
    matches: (buffer: Buffer) =>
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    // 0~3바이트가 "RIFF", 8~11바이트가 "WEBP".
    // 4~7바이트는 파일 크기라 값이 매번 달라서 건너뛴다.
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

/**
 * 업로드된 파일이 실제로 허용된 이미지인지 검사한다.
 *
 * 주의: multer를 memoryStorage로 쓸 때만 동작한다.
 * diskStorage로 바꾸면 file.buffer가 비어 있고 file.path만 채워진다.
 */
@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File) {
    const signature = IMAGE_SIGNATURES.find((image) =>
      image.matches(value.buffer),
    );

    if (!signature) {
      throw new BadRequestException(
        '이미지 파일 형식은 jpeg, png 또는 webp여야 합니다.',
      );
    }

    // 아래 두 줄은 클라이언트가 보낸 값을 실제 감지 결과로 덮어쓴다.

    // 예) Content-Type: image/png 이라 주장해도 내용이 JPEG면 'image/jpeg'로 교정.
    value.mimetype = signature.mime;

    // 확장자도 교체. 이름(base)만 남기고 확장자를 갈아끼운다.
    //   'evil.php'  -> 'evil.png'    (위장 확장자 제거)
    //   'photo.jpg' -> 'photo.jpeg'  (photo.jpg.jpeg 방지)
    //   'noext'     -> 'noext.webp'  (확장자가 없던 경우)
    value.originalname = `${basename(
      value.originalname, // 'photo.jpg'
      extname(value.originalname), // '.jpg'  <- basename이 이 부분을 잘라냄
    )}.${signature.ext}`;

    return value;
  }
}
