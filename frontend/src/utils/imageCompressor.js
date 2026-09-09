export const compressImageFile = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(event.target.result);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const handleImageChange = (e, callback) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // Reset input value so re-selecting same file triggers change
  e.target.value = '';

  compressImageFile(file)
    .then(compressedBase64 => {
      callback(compressedBase64);
    })
    .catch(() => {
      // Fallback
      const reader = new FileReader();
      reader.onload = (event) => callback(event.target.result);
      reader.readAsDataURL(file);
    });
};

