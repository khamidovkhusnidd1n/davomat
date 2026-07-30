from PIL import Image
from PIL.ExifTags import TAGS
import os

images = [
    r"c:\Users\Salohiddin Markaz\Desktop\davomat\po_extracted\PO xujjatlar\U.Rajabov\IMG_0001.jpg",
    r"c:\Users\Salohiddin Markaz\Desktop\davomat\po_extracted\PO xujjatlar\S.Sabirbayev\photo_2026-01-08_16-47-04.jpg"
]

for img_path in images:
    print(f"\nImage: {os.path.basename(img_path)}")
    if not os.path.exists(img_path):
        print("Not found.")
        continue
    try:
        img = Image.open(img_path)
        info = img._getexif()
        if info:
            for tag, value in info.items():
                decoded = TAGS.get(tag, tag)
                print(f"  {decoded}: {value}")
        else:
            print("  No EXIF metadata.")
    except Exception as e:
        print("  Error:", e)
