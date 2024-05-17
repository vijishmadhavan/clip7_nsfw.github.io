class NsfwDetector {
    constructor() {
        this._nsfwLabels = ['NSFW', 'SFW'];
        this._classifierPromise = window.tensorflowPipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    }

    async isNsfw(imageUrl) {
        let blobUrl = '';
        try {
            blobUrl = await this._loadAndResizeImage(imageUrl);
            const classifier = await this._classifierPromise;
            const output = await classifier(blobUrl, this._nsfwLabels);

            const topClass = output[0];
            const isNsfw = topClass.label === 'NSFW';

            if (isNsfw) {
                console.log(`Classification for ${imageUrl}:`, 'NSFW');
                console.log('Detailed classification results:', output);
                return true;
            } else {
                console.log(`Classification for ${imageUrl}:`, 'Safe');
                console.log('Detailed classification results:', output);
                return false;
            }
        } catch (error) {
            console.error('Error during NSFW classification: ', error);
            throw error;
        } finally {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }

    async _loadAndResizeImage(imageUrl) {
        const img = await this._loadImage(imageUrl);
        const offScreenCanvas = document.createElement('canvas');
        const ctx = offScreenCanvas.getContext('2d');
        offScreenCanvas.width = 124;
        offScreenCanvas.height = 124;
        ctx.drawImage(img, 0, 0, offScreenCanvas.width, offScreenCanvas.height);
        return new Promise((resolve, reject) => {
            offScreenCanvas.toBlob(blob => {
                if (!blob) {
                    reject('Canvas to Blob conversion failed');
                    return;
                }
                const blobUrl = URL.createObjectURL(blob);
                resolve(blobUrl);
            }, 'image/jpeg');
        });
    }

    async _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Failed to load image: ${url}`);
            img.src = url;
        });
    }

    async isNsfwBulk(imageUrls, concurrencyLimit = 5) {
        const semaphore = new Array(concurrencyLimit).fill(Promise.resolve());
        const results = [];

        const processImage = async (imageUrl) => {
            const index = await Promise.race(semaphore.map((p, index) => p.then(() => index)));
            semaphore[index] = this.isNsfw(imageUrl).then(result => {
                console.log(`Classification for ${imageUrl}:`, result ? 'NSFW' : 'Safe');
                if (!result) { // If the image is safe, display it immediately
                    window.displayImage(imageUrl); // Ensure displayImage is globally accessible
                }
                results.push({ imageUrl, isNsfw: result });
                return null;
            }).catch(error => {
                console.error(`Error processing image ${imageUrl}:`, error);
                results.push({ imageUrl, error: error.toString() });
                return null;
            });
        };

        await Promise.all(imageUrls.map(processImage));
        await Promise.all(semaphore); // Wait for all ongoing processes to finish
        return results;
    }
}
