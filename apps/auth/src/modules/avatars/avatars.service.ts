import { Injectable } from '@nestjs/common';

@Injectable()
export class AvatarsService {
  uploadProfileImage(userId: string, filePath: string) {
    // Implement the logic to handle the uploaded profile image
    // For example, you can save the file path to the user's profile in the database
    console.log(`User ID: ${userId}, File Path: ${filePath}`);
    return { message: 'Profile image uploaded successfully', filePath };
  }
}
