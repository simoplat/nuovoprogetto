import os
import glob
from PIL import Image

def optimize_images():
    img_dir = os.path.join("games", "lupus", "img")
    jpg_files = sorted(glob.glob(os.path.join(img_dir, "*.jpg")))

    if not jpg_files:
        print("Nessun file JPG trovato in", img_dir)
        return

    total_orig_bytes = 0
    total_webp_bytes = 0
    total_opt_jpg_bytes = 0

    print(f"Trovate {len(jpg_files)} immagini in {img_dir}. Inizio conversione...\n")

    for file_path in jpg_files:
        filename = os.path.basename(file_path)
        base_name, _ = os.path.splitext(filename)
        orig_size = os.path.getsize(file_path)
        total_orig_bytes += orig_size

        with Image.open(file_path) as im:
            # Mantieni rapporto di aspetto calcolato a max 800px di altezza
            max_height = 800
            scale = min(1.0, max_height / im.height)
            new_width = round(im.width * scale)
            new_height = round(im.height * scale)

            im_resized = im.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # 1. Salva versione WebP ad alte prestazioni
            webp_path = os.path.join(img_dir, f"{base_name}.webp")
            im_resized.save(webp_path, "WEBP", quality=80, method=6)
            webp_size = os.path.getsize(webp_path)
            total_webp_bytes += webp_size

            # 2. Ottimizza anche il file JPG originale in-place (progressive + compressione 82%)
            im_resized.save(file_path, "JPEG", quality=82, optimize=True, progressive=True)
            opt_jpg_size = os.path.getsize(file_path)
            total_opt_jpg_bytes += opt_jpg_size

            saving_pct = (1 - (webp_size / orig_size)) * 100
            print(f"[OK] {filename}: {orig_size/1024:.1f} KB -> WebP: {webp_size/1024:.1f} KB (risparmio {saving_pct:.1f}%) | JPG: {opt_jpg_size/1024:.1f} KB")

    total_orig_mb = total_orig_bytes / (1024 * 1024)
    total_webp_mb = total_webp_bytes / (1024 * 1024)
    total_opt_jpg_mb = total_opt_jpg_bytes / (1024 * 1024)
    total_saving_pct = (1 - (total_webp_bytes / total_orig_bytes)) * 100

    print("\n" + "="*60)
    print(f"Riepilogo Totale:")
    print(f"  Dimensioni originali : {total_orig_mb:.2f} MB")
    print(f"  Nuove dimensioni WebP: {total_webp_mb:.2f} MB (risparmio del {total_saving_pct:.1f}%)")
    print(f"  Nuove dimensioni JPG : {total_opt_jpg_mb:.2f} MB")
    print("="*60)

if __name__ == "__main__":
    optimize_images()
