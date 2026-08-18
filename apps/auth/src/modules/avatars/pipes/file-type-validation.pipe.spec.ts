import { BadRequestException } from '@nestjs/common';
import { FileTypeValidationPipe } from './file-type-validation.pipe';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]), // 파일 크기 자리 (판별에는 안 쓰임)
  Buffer.from('WEBP'),
]);
const GIF = Buffer.from('GIF89a'); // 이미지지만 우리가 허용하지 않는 포맷
const PHP = Buffer.from('<?php echo 1; ?>'); // 이미지가 아예 아님

/**
 * 파이프에 넘길 파일 객체를 만든다.
 * multer가 만드는 진짜 객체엔 필드가 더 많지만
 * 파이프가 쓰는 건 buffer/originalname뿐이라 그 둘만 채운다.
 */
function createFile(buffer: Buffer, originalname: string) {
  return {
    buffer,
    originalname,
    mimetype: 'image/png', // 클라이언트가 보냈다고 가정하는 값 (신뢰 못 함)
    fieldname: 'avatar',
    size: buffer.length,
  } as Express.Multer.File;
}

describe('FileTypeValidationPipe', () => {
  let pipe: FileTypeValidationPipe;

  // beforeEach = 각 it이 실행되기 직전에 매번 돌아간다.
  // 테스트끼리 상태를 공유하지 않도록 매번 새 인스턴스를 만든다.
  beforeEach(() => {
    pipe = new FileTypeValidationPipe();
  });

  describe('허용된 포맷', () => {
    // it.each = 같은 테스트를 값만 바꿔 여러 번 돌린다.
    // 아래 3줄이 각각 하나의 테스트로 실행된다.
    it.each([
      ['jpeg', JPEG, 'image/jpeg'],
      ['png', PNG, 'image/png'],
      ['webp', WEBP, 'image/webp'],
    ])('%s는 통과시킨다', (ext, buffer, expectedMime) => {
      const file = createFile(buffer as Buffer, `photo.${ext as string}`);

      const result = pipe.transform(file);

      expect(result.mimetype).toBe(expectedMime);
    });
  });

  describe('거부해야 하는 파일', () => {
    /**
     * 여기가 이 파이프의 존재 이유다.
     * 확장자가 .png여도 내용물이 PHP면 막아야 한다.
     *
     * toThrow는 "이 함수를 호출하면 에러가 나야 한다"는 뜻이라
     * pipe.transform(file)을 바로 부르지 않고 () => 로 감싸서 넘긴다.
     * 감싸지 않으면 expect에 도달하기 전에 에러가 터져 테스트가 깨진다.
     */
    it('확장자를 png로 위장한 php 파일을 막는다', () => {
      const file = createFile(PHP, 'evil.png');

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it('허용 목록에 없는 이미지(gif)를 막는다', () => {
      const file = createFile(GIF, 'animation.gif');

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it('포맷을 판별할 수 없는 파일을 막는다', () => {
      const file = createFile(Buffer.from('hello world'), 'memo.png');

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it('매직 넘버를 다 채우지 못할 만큼 짧은 파일을 막는다', () => {
      // PNG 시그니처의 앞 3바이트만 있는 경우.
      // 길이 검사를 빠뜨리면 여기서 통과해버린다.
      const file = createFile(Buffer.from([0x89, 0x50, 0x4e]), 'tiny.png');

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });
  });

  describe('파일명 교정', () => {
    it('위장 확장자를 실제 포맷으로 바꾼다', () => {
      // 내용은 PNG인데 이름은 .php로 올라온 경우
      const file = createFile(PNG, 'evil.php');

      const result = pipe.transform(file);

      expect(result.originalname).toBe('evil.png');
    });

    it('확장자를 중복해서 붙이지 않는다', () => {
      // jpg 파일의 실제 포맷명은 jpeg다.
      // 잘못 짜면 photo.jpg.jpeg가 되기 때문에 확인해두는 케이스.
      const file = createFile(JPEG, 'photo.jpg');

      const result = pipe.transform(file);

      expect(result.originalname).toBe('photo.jpeg');
    });

    it('확장자가 없던 파일에도 확장자를 붙인다', () => {
      const file = createFile(WEBP, 'noext');

      const result = pipe.transform(file);

      expect(result.originalname).toBe('noext.webp');
    });
  });
});
