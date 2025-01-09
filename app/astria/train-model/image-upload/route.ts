// /pages/api/astria/train-model/image-upload.ts

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'; // Corrected import
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Configure Vercel Blob (#7 step in the README)
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
        if (!user) {
          throw new Error('Unauthorized');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
          tokenPayload: JSON.stringify({
            userId: user.id, // Including the user ID in the token payload
            // optional, sent to your server on upload completion
            // you could pass a user id from auth, or a value from clientPayload
            pathname: pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }: any) => {
        // Get notified of client upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow
        console.log('Blob upload completed', blob, tokenPayload);

        try {
          // Run any logic after the file upload completed
          const { userId } = JSON.parse(tokenPayload);
          // Example: Update user's avatar URL in the database
          // await db.updateUserAvatar(userId, blob.url);
          // Ensure you have a corresponding function in your database layer
        } catch (error) {
          console.error('Error updating user data after upload:', error);
          throw new Error('Could not update user data after upload');
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error('Error in image-upload endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    );
  }
}
