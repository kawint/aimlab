import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import MODEL from './scene.gltf';

class M4A1 extends Group {
    constructor() {
        // Call parent Group() constructor
        super();

        const loader = new GLTFLoader();

        this.name = 'scene';

        loader.load(MODEL, (gltf) => {
            this.add(gltf.scene);
        });
    }
}

export default M4A1;
