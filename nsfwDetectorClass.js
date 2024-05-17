class NsfwDetector {
    constructor() {
        this._nsfwLabels = ['NSFW', 'SFW'];
        this._ageLabels = ['ADULT', 'CHILD'];
        this._dressLabels = ['VULGAR', 'DECENT'];  // Labels for dress style
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
                return true; // Block immediately if NSFW
            } else {
                // If the image is classified as SFW, check if it features an adult or child
                const ageOutput = await classifier(blobUrl, this._ageLabels);
                const topAgeClass = ageOutput[0];
                const isChild = topAgeClass.label === 'CHILD';

                if (isChild) {
                    console.log(`Classification for ${imageUrl}:`, 'Safe (Child)');
                    console.log('Detailed classification results:', ageOutput);
                    return true; // Consider further action or blocking
                } else {
                    // Check dress style if adult
                    const dressOutput = await classifier(blobUrl, this._dressLabels);
                    const topDressClass = dressOutput[0];
                    const isVulgar = topDressClass.label === 'VULGAR';

                    if (isVulgar) {
                        console.log(`Classification for ${imageUrl}:`, 'Blocked (Vulgar Dress)');
                        console.log('Detailed classification results:', dressOutput);
                        return true; // Block due to vulgar dress
                    } else {
                        console.log(`Classification for ${imageUrl}:`, 'Safe (Decent Dress)');
                        console.log('Detailed classification results:', dressOutput);
                        return false; // Image is safe
                    }
                }
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
}

window.NsfwDetector = NsfwDetector;

