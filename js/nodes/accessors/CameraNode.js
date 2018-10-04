/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.CameraNode = function(scope, camera) {

    v3d.TempNode.call(this, 'v3');

    this.setScope(scope || v3d.CameraNode.POSITION);
    this.setCamera(camera);

};

v3d.CameraNode.fDepthColor = new v3d.FunctionNode([
"float depthColor(float mNear, float mFar) {",
"    #ifdef USE_LOGDEPTHBUF_EXT",
"        float depth = gl_FragDepthEXT / gl_FragCoord.w;",
"    #else",
"        float depth = gl_FragCoord.z / gl_FragCoord.w;",
"    #endif",
"    return 1.0 - smoothstep(mNear, mFar, depth);",
"}"
].join("\n"));

v3d.CameraNode.POSITION = 'position';
v3d.CameraNode.DEPTH = 'depth';
v3d.CameraNode.TO_VERTEX = 'toVertex';

v3d.CameraNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.CameraNode.prototype.constructor = v3d.CameraNode;

v3d.CameraNode.prototype.setCamera = function(camera) {

    this.camera = camera;
    this.requestUpdate = camera !== undefined;

};

v3d.CameraNode.prototype.setScope = function(scope) {

    switch (this.scope) {

        case v3d.CameraNode.DEPTH:

            delete this.near;
            delete this.far;

            break;

    }

    this.scope = scope;

    switch (scope) {

        case v3d.CameraNode.DEPTH:

            this.near = new v3d.FloatNode(camera ? camera.near : 1);
            this.far = new v3d.FloatNode(camera ? camera.far : 1200);

            break;

    }

};

v3d.CameraNode.prototype.getType = function(builder) {

    switch (this.scope) {
        case v3d.CameraNode.DEPTH:
            return 'fv1';
    }

    return this.type;

};

v3d.CameraNode.prototype.isUnique = function(builder) {

    switch (this.scope) {
        case v3d.CameraNode.DEPTH:
        case v3d.CameraNode.TO_VERTEX:
            return true;
    }

    return false;

};

v3d.CameraNode.prototype.isShared = function(builder) {

    switch (this.scope) {
        case v3d.CameraNode.POSITION:
            return false;
    }

    return true;

};

v3d.CameraNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    switch (this.scope) {

        case v3d.CameraNode.POSITION:

            result = 'cameraPosition';

            break;

        case v3d.CameraNode.DEPTH:

            var func = v3d.CameraNode.fDepthColor;

            builder.include(func);

            result = func.name + '(' + this.near.build(builder, 'fv1') + ',' + this.far.build(builder, 'fv1') + ')';

            break;

        case v3d.CameraNode.TO_VERTEX:

            result = 'normalize(' + new v3d.PositionNode(v3d.PositionNode.WORLD).build(builder, 'v3') + ' - cameraPosition)';

            break;

    }

    return builder.format(result, this.getType(builder), output);

};

v3d.CameraNode.prototype.updateFrame = function(delta) {

    switch (this.scope) {

        case v3d.CameraNode.DEPTH:

            this.near.number = camera.near;
            this.far.number = camera.far;

            break;

    }

};
