import os
import shutil
from bing_image_downloader import downloader

# Download only one image
downloader.download(
    "human face",
    limit=1,
    output_dir="test_data",
    adult_filter_off=True,
    force_replace=True
)

# Folder where Bing saves the image
download_folder = os.path.join("test_data", "human face")

# Get the downloaded image
image_name = os.listdir(download_folder)[0]
image_path = os.path.join(download_folder, image_name)

# Rename/move it
shutil.move(image_path, "test_data/sample_face.jpg")

# Remove the empty folder
os.rmdir(download_folder)

print("Image saved as test_data/sample_face.jpg")