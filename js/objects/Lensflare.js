/**
 * @author Mugen87 / https://github.com/Mugen87
 * @author mrdoob / http://mrdoob.com/
 */

v3d.Lensflare = function() {

    v3d.Mesh.call(this, v3d.Lensflare.Geometry, new v3d.MeshBasicMaterial({ opacity: 0, transparent: true }));

    this.type = 'Lensflare';
    this.frustumCulled = false;
    this.renderOrder = Infinity;

    //

    var positionScreen = new v3d.Vector3();
    var positionView = new v3d.Vector3();

    // textures

    var tempMap = new v3d.DataTexture(new Uint8Array(16 * 16 * 3), 16, 16, v3d.RGBFormat);
    tempMap.minFilter = v3d.NearestFilter;
    tempMap.magFilter = v3d.NearestFilter;
    tempMap.wrapS = v3d.ClampToEdgeWrapping;
    tempMap.wrapT = v3d.ClampToEdgeWrapping;

    var occlusionMap = new v3d.DataTexture(new Uint8Array(16 * 16 * 3), 16, 16, v3d.RGBFormat);
    occlusionMap.minFilter = v3d.NearestFilter;
    occlusionMap.magFilter = v3d.NearestFilter;
    occlusionMap.wrapS = v3d.ClampToEdgeWrapping;
    occlusionMap.wrapT = v3d.ClampToEdgeWrapping;

    // material

    var geometry = v3d.Lensflare.Geometry;

    var material1a = new v3d.RawShaderMaterial({
        uniforms: {
            'scale': { value: null },
            'screenPosition': { value: null }
        },
        vertexShader: [

            'precision highp float;',

            'uniform vec3 screenPosition;',
            'uniform vec2 scale;',

            'attribute vec3 position;',

            'void main() {',

            '    gl_Position = vec4(position.xy * scale + screenPosition.xy, screenPosition.z, 1.0);',

            '}'

        ].join('\n'),
        fragmentShader: [

            'precision highp float;',

            'void main() {',

            '    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);',

            '}'

        ].join('\n'),
        depthTest: true,
        depthWrite: false,
        transparent: false
    });

    var material1b = new v3d.RawShaderMaterial({
        uniforms: {
            'map': { value: tempMap },
            'scale': { value: null },
            'screenPosition': { value: null }
        },
        vertexShader: [

            'precision highp float;',

            'uniform vec3 screenPosition;',
            'uniform vec2 scale;',

            'attribute vec3 position;',
            'attribute vec2 uv;',

            'varying vec2 vUV;',

            'void main() {',

            '    vUV = uv;',

            '    gl_Position = vec4(position.xy * scale + screenPosition.xy, screenPosition.z, 1.0);',

            '}'

        ].join('\n'),
        fragmentShader: [

            'precision highp float;',

            'uniform sampler2D map;',

            'varying vec2 vUV;',

            'void main() {',

            '    gl_FragColor = texture2D(map, vUV);',

            '}'

        ].join('\n'),
        depthTest: false,
        depthWrite: false,
        transparent: false
    });

    // the following object is used for occlusionMap generation

    var mesh1 = new v3d.Mesh(geometry, material1a);

    //

    var elements = [];

    var shader = v3d.LensflareElement.Shader;

    var material2 = new v3d.RawShaderMaterial({
        uniforms: {
            'map': { value: null },
            'occlusionMap': { value: occlusionMap },
            'color': { value: new v3d.Color(0xffffff) },
            'scale': { value: new v3d.Vector2() },
            'screenPosition': { value: new v3d.Vector3() }
        },
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        blending: v3d.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    var mesh2 = new v3d.Mesh(geometry, material2);

    this.addElement = function(element) {

        elements.push(element);

    };

    //

    var scale = new v3d.Vector2();
    var screenPositionPixels = new v3d.Vector2();
    var validArea = new v3d.Box2();
    var viewport = new v3d.Vector4();

    this.onBeforeRender = function(renderer, scene, camera) {

        renderer.getCurrentViewport(viewport);

        var invAspect = viewport.w / viewport.z;
        var halfViewportWidth = viewport.z / 2.0;
        var halfViewportHeight = viewport.w / 2.0;

        var size = 16 / viewport.w;
        scale.set(size * invAspect, size);

        validArea.min.set(viewport.x, viewport.y);
        validArea.max.set(viewport.x + (viewport.z - 16), viewport.y + (viewport.w - 16));

        // calculate position in screen space

        positionView.setFromMatrixPosition(this.matrixWorld);
        positionView.applyMatrix4(camera.matrixWorldInverse);

        if (positionView.z > 0) return; // lensflare is behind the camera

        positionScreen.copy(positionView).applyMatrix4(camera.projectionMatrix);

        // horizontal and vertical coordinate of the lower left corner of the pixels to copy

        screenPositionPixels.x = viewport.x + (positionScreen.x * halfViewportWidth) + halfViewportWidth - 8;
        screenPositionPixels.y = viewport.y + (positionScreen.y * halfViewportHeight) + halfViewportHeight - 8;

        // screen cull

        if (validArea.containsPoint(screenPositionPixels)) {

            // save current RGB to temp texture

            renderer.copyFramebufferToTexture(screenPositionPixels, tempMap);

            // render pink quad

            var uniforms = material1a.uniforms;
            uniforms["scale"].value = scale;
            uniforms["screenPosition"].value = positionScreen;

            renderer.renderBufferDirect(camera, null, geometry, material1a, mesh1, null);

            // copy result to occlusionMap

            renderer.copyFramebufferToTexture(screenPositionPixels, occlusionMap);

            // restore graphics

            var uniforms = material1b.uniforms;
            uniforms["scale"].value = scale;
            uniforms["screenPosition"].value = positionScreen;

            renderer.renderBufferDirect(camera, null, geometry, material1b, mesh1, null);

            // render elements

            var vecX = - positionScreen.x * 2;
            var vecY = - positionScreen.y * 2;

            for (var i = 0, l = elements.length; i < l; i++) {

                var element = elements[i];

                var uniforms = material2.uniforms;

                uniforms["color"].value.copy(element.color);
                uniforms["map"].value = element.texture;
                uniforms["screenPosition"].value.x = positionScreen.x + vecX * element.distance;
                uniforms["screenPosition"].value.y = positionScreen.y + vecY * element.distance;

                var size = element.size / viewport.w;
                var invAspect = viewport.w / viewport.z;

                uniforms["scale"].value.set(size * invAspect, size);

                material2.uniformsNeedUpdate = true;

                renderer.renderBufferDirect(camera, null, geometry, material2, mesh2, null);

            }

        }

    };

    this.dispose = function() {

        material1a.dispose();
        material1b.dispose();
        material2.dispose();

        tempMap.dispose();
        occlusionMap.dispose();

        for (var i = 0, l = elements.length; i < l; i++) {

            elements[i].texture.dispose();

        }

    };

};

v3d.Lensflare.prototype = Object.create(v3d.Mesh.prototype);
v3d.Lensflare.prototype.constructor = v3d.Lensflare;
v3d.Lensflare.prototype.isLensflare = true;

//

v3d.LensflareElement = function(texture, size, distance, color) {

    this.texture = texture;
    this.size = size || 1;
    this.distance = distance || 0;
    this.color = color || new v3d.Color(0xffffff);

};

v3d.LensflareElement.Shader = {

    uniforms: {

        'map': { value: null },
        'occlusionMap': { value: null },
        'color': { value: null },
        'scale': { value: null },
        'screenPosition': { value: null }

    },

    vertexShader: [

        'precision highp float;',

        'uniform vec3 screenPosition;',
        'uniform vec2 scale;',

        'uniform sampler2D occlusionMap;',

        'attribute vec3 position;',
        'attribute vec2 uv;',

        'varying vec2 vUV;',
        'varying float vVisibility;',

        'void main() {',

        '    vUV = uv;',

        '    vec2 pos = position.xy;',

        '    vec4 visibility = texture2D(occlusionMap, vec2(0.1, 0.1));',
        '    visibility += texture2D(occlusionMap, vec2(0.5, 0.1));',
        '    visibility += texture2D(occlusionMap, vec2(0.9, 0.1));',
        '    visibility += texture2D(occlusionMap, vec2(0.9, 0.5));',
        '    visibility += texture2D(occlusionMap, vec2(0.9, 0.9));',
        '    visibility += texture2D(occlusionMap, vec2(0.5, 0.9));',
        '    visibility += texture2D(occlusionMap, vec2(0.1, 0.9));',
        '    visibility += texture2D(occlusionMap, vec2(0.1, 0.5));',
        '    visibility += texture2D(occlusionMap, vec2(0.5, 0.5));',

        '    vVisibility =        visibility.r / 9.0;',
        '    vVisibility *= 1.0 - visibility.g / 9.0;',
        '    vVisibility *=       visibility.b / 9.0;',

        '    gl_Position = vec4((pos * scale + screenPosition.xy).xy, screenPosition.z, 1.0);',

        '}'

    ].join('\n'),

    fragmentShader: [

        'precision highp float;',

        'uniform sampler2D map;',
        'uniform vec3 color;',

        'varying vec2 vUV;',
        'varying float vVisibility;',

        'void main() {',

        '    vec4 texture = texture2D(map, vUV);',
        '    texture.a *= vVisibility;',
        '    gl_FragColor = texture;',
        '    gl_FragColor.rgb *= color;',

        '}'

    ].join('\n')

};

v3d.Lensflare.Geometry = (function() {

    var geometry = new v3d.BufferGeometry();

    var float32Array = new Float32Array([
        - 1, - 1, 0, 0, 0,
        1, - 1, 0, 1, 0,
        1, 1, 0, 1, 1,
        - 1, 1, 0, 0, 1
    ]);

    var interleavedBuffer = new v3d.InterleavedBuffer(float32Array, 5);

    geometry.setIndex([0, 1, 2,    0, 2, 3]);
    geometry.setAttribute('position', new v3d.InterleavedBufferAttribute(interleavedBuffer, 3, 0, false));
    geometry.setAttribute('uv', new v3d.InterleavedBufferAttribute(interleavedBuffer, 2, 3, false));

    return geometry;

})();
