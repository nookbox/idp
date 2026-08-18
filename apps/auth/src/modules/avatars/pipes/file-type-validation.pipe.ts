import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { basename, extname } from 'path';

const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  async transform(value: Express.Multer.File) {
    // 파일 앞부분의 매직 넘버를 실제로 읽어서 판별한다.
    // multer의 value.mimetype은 클라이언트가 보낸 헤더 값이라 위조 가능.
    const fileType = await fileTypeFromBuffer(value.buffer);

    if (!fileType || !MIME_TYPES.includes(fileType.mime)) {
      throw new BadRequestException(
        '이미지 파일 형식은 jpeg, png 또는 webp여야 합니다.',
      );
    }

    // 아래 두 줄은 클라이언트가 보낸 값을 감지 결과로 덮어쓴다.

    // 예) Content-Type: image/png 이라 주장해도 실제 바이트가 JPEG면
    //     'image/jpeg'로 교정된다.
    value.mimetype = fileType.mime;

    // 확장자도 감지 결과로 교체. 이름(base)만 남기고 확장자를 갈아끼운다.
    //   'evil.php'  + ext 'png'  ->  'evil.png'    (위장 확장자 제거)
    //   'photo.jpg' + ext 'jpeg' ->  'photo.jpeg'  (photo.jpg.jpeg 방지)
    //   'noext'     + ext 'webp' ->  'noext.webp'  (확장자가 없던 경우)
    value.originalname = `${basename(
      value.originalname, // 'photo.jpg'
      extname(value.originalname), // '.jpg'  <- basename이 이 부분을 잘라냄
    )}.${fileType.ext}`; // 'photo' + '.' + 'jpeg'

    return value;
  }
}
