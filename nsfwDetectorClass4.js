class NsfwDetector {
    constructor() {
        this._nsfwLabels = [
            'ANIME_NAKED','ANIME_PORN','CARTOON_NAKED','CARTOON_PORN','CARTOON_KID','FEMALE_BREAST_EXPOSED','KIDS','CHILD_FACE','CHILDREN','TEENAGER','NAKED','NUDE','PARTIAL_NUDITY','FEMALE_GENITALIA_EXPOSED', 'BUTTOCKS_EXPOSED', 'ANUS_EXPOSED',
        'MALE_GENITALIA_EXPOSED', 'BLOOD_SHED', 'VIOLENCE', 'GORE', 'PORNOGRAPHY', 'DRUGS', 'ALCOHOL','CHILD_PORN',
        'CHILD_KISS','CHILD_VULGARITY','INAPROPRIATE_CLOTHING','SENSUAL_KISS','CHILD_PLAYING','LYING_ON_BED','BABY',
        'TODDLER','PRESCHOOLER','SCHOOL_AGE_CHILD','PRETEEN','ADOLESCENT','MALE_CHILD','FEMALE_CHILD','BOY','GIRL',
        'REVEALING_CLOTHING','LINGERIE','SWIMWEAR','SHEER_CLOTHING','BIKINI','UNDERWEAR','TIGHT_CLOTHING','PLUNGING_NECKLINE',
        'GARTER_BELT','FETISH_CLOTHING','LATEX_CLOTHING','FISHNET','MINI_SKIRT','BACKLESS_DRESS','TRANSPARENT_CLOTHING','BODYCON_DRESS', 'LEOTARD', 'STOCKINGS','REVEALING_GYM_WEAR',
        'REAR_CUTOUT_DRESS','BOOTY_DRESS','HIGH_CUT_REAR_DRESS','EXPOSED_BUTTOCKS_DRESS','WET_REVEALING_CLOTHING', 'WET_SHEER_DRESS', 'CLINGY_WET_DRESS', 'SOAKED_TRANSPARENT_CLOTHING','cleavage_dress',
        ];
        
        this._sfwLabels = [
            'FULLY_CLOTHED', 'CONSERVATIVE_CLOTHING', 'MODEST_CLOTHING', 'FORMAL_ATTIRE', 'BUSINESS_ATTIRE',
            'CASUAL_ATTIRE', 'LOOSE_FITTING_CLOTHING', 'LONG_SLEEVES', 'TROUSERS', 'DRESSES_BELOW_KNEE',
            'HIGH_NECKLINE', 'TURTLENECK', 'BUTTON_UP_SHIRT', 'COLLARED_SHIRT', 'T-SHIRT', 'BLOUSE', 'SWEATER',
            'JACKET', 'COAT', 'JEANS', 'SHORTS_KNEE_LENGTH', 'SKIRT_KNEE_LENGTH', 'DRESS_KNEE_LENGTH', 'SUIT',
            'UNIFORM', 'RELIGIOUS_CLOTHING', 'TRADITIONAL_CLOTHING', 'SPORTS_JERSEY', 'ATHLETIC_WEAR',
            'SWEATSHIRT', 'SWEATPANTS', 'PAJAMAS', 'SCRUBS', 'LAB_COAT', 'APRON', 'OVERALLS', 'VEST', 'BOWTIE',
            'NECKTIE', 'SCARF', 'HAT', 'CAP', 'GLOVES', 'MITTENS', 'SOCKS', 'SHOES', 'BOOTS', 'SANDALS', 'SLIPPERS',
            'COSTUMES_AND_COSPLAY', 'HISTORICAL_CLOTHING', 'CULTURAL_CLOTHING'
        ];
        
        this._classifierPromise = window.tensorflowPipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    }

    async isNsfw(imageUrl) {
        let blobUrl = '';
        try {
            blobUrl = await this._loadAndResizeImage(imageUrl);
            const classifier = await this._classifierPromise;
            const output = await classifier(blobUrl, [...this._nsfwLabels, ...this._sfwLabels]);
    
            // Check if the top class is NSFW
            const topClass = output[0];
            const isNsfw = this._nsfwLabels.includes(topClass.label);
    
            console.log(`Classification for ${imageUrl}:`, isNsfw ? 'NSFW' : 'Safe');
            console.log('Detailed classification results:', output);
            return isNsfw;
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

window.NsfwDetector = NsfwDetector;
