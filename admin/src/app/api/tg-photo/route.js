export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tg_id = searchParams.get('tg_id');
    
    if (!tg_id) {
      return new Response('Missing tg_id', { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return new Response('No bot token', { status: 500 });
    }

    // 1. Get user profile photos
    const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${tg_id}&limit=1`);
    const photosData = await photosRes.json();

    if (!photosData.ok || photosData.result.total_count === 0) {
      return new Response('No photo', { status: 404 });
    }

    // Get the highest resolution of the first photo
    const photoArray = photosData.result.photos[0];
    const fileId = photoArray[photoArray.length - 1].file_id;

    // 2. Get file path
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      return new Response('Could not get file path', { status: 404 });
    }

    const filePath = fileData.result.file_path;
    const photoUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // Redirect directly to the photo URL so it can be used in <img src="..." />
    return Response.redirect(photoUrl, 302);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
