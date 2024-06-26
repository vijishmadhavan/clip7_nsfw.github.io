class NsfwDetector {
    constructor() {
        this._nsfwLabels = ['NSFW', 'SFW'];
        this._subjectLabels = ['ADULT', 'CHILD', 'OBJECT', 'ROBOT', 'ANIMAL', 'OTHER']; // Subject categories
        this._dressLabels = ['VULGAR_DRESS', 'TIGHT_DRESS','CLEAVAGE_DRESS','BUTTOCKS_DRESS','DECENT_DRESS', 'OTHER']; // Dress style categories
        this._classifierPromise = window.tensorflowPipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    }

    async isNsfw(imageUrl) {
        let blobUrl = '';
        try {
            blobUrl = await this._loadAndResizeImage(imageUrl);
            const classifier = await this._classifierPromise;
            const nsfwOutput = await classifier(blobUrl, this._nsfwLabels);
    
            const topClass = nsfwOutput[0];
            const isNsfw = topClass.label === 'NSFW';
    
            if (isNsfw) {
                console.log(`Blocked: NSFW content detected.`);
                return true; // Block immediately if NSFW
            } else {
                // If the image is classified as SFW, check the subject
                const subjectOutput = await classifier(blobUrl, this._subjectLabels);
                const topSubjectClass = subjectOutput[0];
    
                if (topSubjectClass.label === 'CHILD') {
                    console.log(`Blocked: Image features a child.`);
                    return true; // Block images with children
                } else if (topSubjectClass.label === 'ADULT') {
                    // Check dress style if subject is an adult
                    const dressOutput = await classifier(blobUrl, this._dressLabels);
                    const topDressClass = dressOutput[0];
    
                    if (topDressClass.label === 'VULGAR_DRESS' || topDressClass.label === 'TIGHT_DRESS' || topDressClass.label === 'BUTTOCKS_DRESS' || topDressClass.label === 'CLEAVAGE_DRESS') {
                        console.log(`Blocked: Inappropriate dress detected.`);
                        return true; // Block if any inappropriate dress types are detected
                    } else {
                        console.log(`Displayed: Content is appropriate.`);
                        return false; // Display if decent or other type of dress
                    }
                } else {
                    console.log(`Displayed: Content is appropriate.`);
                    return false; // Display all other categories
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
