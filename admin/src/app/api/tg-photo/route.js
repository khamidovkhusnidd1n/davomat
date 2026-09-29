export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tg_id = searchParams.get('tg_id');
    const name = searchParams.get('name') || 'User';
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=25262B&color=F8F9FA`;
    
    if (!tg_id) {
      return Response.redirect(fallbackAvatar, 302);
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    if (!token) {
      return Response.redirect(fallbackAvatar, 302);
    }

    // 1. Get user profile photos
    const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${tg_id}&limit=1`);
    const photosData = await photosRes.json();

    if (!photosData.ok || photosData.result.total_count === 0) {
      return Response.redirect(fallbackAvatar, 302);
    }

    // Get the highest resolution of the first photo
    const photoArray = photosData.result.photos[0];
    const fileId = photoArray[photoArray.length - 1].file_id;

    // 2. Get file path
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      return Response.redirect(fallbackAvatar, 302);
    }

    const filePath = fileData.result.file_path;
    const photoUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // Redirect directly to the photo URL so it can be used in <img src="..." />
    return Response.redirect(photoUrl, 302);
  } catch (error) {
    return Response.redirect(fallbackAvatar, 302);
  }
}
