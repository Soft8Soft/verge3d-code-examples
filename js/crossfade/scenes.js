function generateGeometry(objectType, numObjects) {

    function applyVertexColors(geometry, color) {

        var position = geometry.attributes.position;
        var colors = [];

        for (var i = 0; i < position.count; i++) {

            colors.push(color.r, color.g, color.b);

        }

        geometry.addAttribute('color', new v3d.Float32BufferAttribute(colors, 3));

    }

    var geometries = [];

    var matrix = new v3d.Matrix4();
    var position = new v3d.Vector3();
    var rotation = new v3d.Euler();
    var quaternion = new v3d.Quaternion();
    var scale = new v3d.Vector3();
    var color = new v3d.Color();

    for (var i = 0; i < numObjects; i++) {

        position.x = Math.random() * 10000 - 5000;
        position.y = Math.random() * 6000 - 3000;
        position.z = Math.random() * 8000 - 4000;

        rotation.x = Math.random() * 2 * Math.PI;
        rotation.y = Math.random() * 2 * Math.PI;
        rotation.z = Math.random() * 2 * Math.PI;
        quaternion.setFromEuler(rotation, false);

        scale.x = Math.random() * 200 + 100;

        var geometry;

        if (objectType === 'cube') {

            geometry = new v3d.BoxBufferGeometry(1, 1, 1);
            geometry = geometry.toNonIndexed(); // merging needs consistent buffer geometries
            scale.y = Math.random() * 200 + 100;
            scale.z = Math.random() * 200 + 100;
            color.setRGB(0, 0, 0.1 + 0.9 * Math.random());

        } else if (objectType === 'sphere') {

            geometry = new v3d.IcosahedronBufferGeometry(1, 1);
            scale.y = scale.z = scale.x;
            color.setRGB(0.1 + 0.9 * Math.random(), 0, 0);

        }

        // give the geom's vertices a random color, to be displayed
        applyVertexColors(geometry, color);

        matrix.compose(position, quaternion, scale);
        geometry.applyMatrix(matrix);

        geometries.push(geometry);

    }

    return v3d.BufferGeometryUtils.mergeBufferGeometries(geometries);

}

function Scene(type, numObjects, cameraZ, fov, rotationSpeed, clearColor) {

    this.clearColor = clearColor;

    this.camera = new v3d.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.z = cameraZ;

    // Setup scene
    this.scene = new v3d.Scene();
    this.scene.add(new v3d.AmbientLight(0x555555));

    var light = new v3d.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    this.scene.add(light);

    this.rotationSpeed = rotationSpeed;

    var defaultMaterial = new v3d.MeshPhongMaterial({ color: 0xffffff, flatShading: true, vertexColors: v3d.VertexColors });
    this.mesh = new v3d.Mesh(generateGeometry(type, numObjects), defaultMaterial);
    this.scene.add(this.mesh);

    var renderTargetParameters = { minFilter: v3d.LinearFilter, magFilter: v3d.LinearFilter, format: v3d.RGBFormat, stencilBuffer: false };
    this.fbo = new v3d.WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetParameters);

    this.render = function(delta, rtt) {

        this.mesh.rotation.x += delta * this.rotationSpeed.x;
        this.mesh.rotation.y += delta * this.rotationSpeed.y;
        this.mesh.rotation.z += delta * this.rotationSpeed.z;

        renderer.setClearColor(this.clearColor);

        if (rtt)
            renderer.render(this.scene, this.camera, this.fbo, true);
        else
            renderer.render(this.scene, this.camera);

    };

}
