import * as v3d from '../../../build/v3d.module.js';

let camera, scene, renderer, group;

function init(canvas, width, height, pixelRatio, path) {

    camera = new v3d.PerspectiveCamera(40, width / height, 1, 1000);
    camera.position.z = 200;

    scene = new v3d.Scene();
    scene.fog = new v3d.Fog(0x444466, 100, 400);
    scene.background = new v3d.Color(0x444466);

    group = new v3d.Group();
    scene.add(group);

    // we don't use ImageLoader since it has a DOM dependency (HTML5 image element)

    const loader = new v3d.ImageBitmapLoader().setPath(path);
    loader.setOptions({ imageOrientation: 'flipY' });
    loader.load('textures/matcaps/matcap-porcelain-white.jpg', function(imageBitmap) {

        const texture = new v3d.CanvasTexture(imageBitmap);

        const geometry = new v3d.IcosahedronGeometry(5, 8);
        const materials = [
            new v3d.MeshMatcapMaterial({ color: 0xaa24df, matcap: texture }),
            new v3d.MeshMatcapMaterial({ color: 0x605d90, matcap: texture }),
            new v3d.MeshMatcapMaterial({ color: 0xe04a3f, matcap: texture }),
            new v3d.MeshMatcapMaterial({ color: 0xe30456, matcap: texture })
        ];

        for (let i = 0; i < 100; i++) {

            const material = materials[i % materials.length];
            const mesh = new v3d.Mesh(geometry, material);
            mesh.position.x = random() * 200 - 100;
            mesh.position.y = random() * 200 - 100;
            mesh.position.z = random() * 200 - 100;
            mesh.scale.setScalar(random() + 1);
            group.add(mesh);

        }

        renderer = new v3d.WebGLRenderer({ antialias: true, canvas: canvas });
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);

        animate();

    });

}

function animate() {

    // group.rotation.x = Date.now() / 4000;
    group.rotation.y = - Date.now() / 4000;

    renderer.render(scene, camera);

    if (self.requestAnimationFrame) {

        self.requestAnimationFrame(animate);

    } else {

        // Firefox

    }

}

// PRNG

let seed = 1;

function random() {

    const x = Math.sin(seed ++) * 10000;

    return x - Math.floor(x);

}

export default init;
