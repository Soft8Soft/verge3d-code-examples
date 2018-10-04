/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.PositionNode = function(scope) {

    v3d.TempNode.call(this, 'v3');

    this.scope = scope || v3d.PositionNode.LOCAL;

};

v3d.PositionNode.LOCAL = 'local';
v3d.PositionNode.WORLD = 'world';
v3d.PositionNode.VIEW = 'view';
v3d.PositionNode.PROJECTION = 'projection';

v3d.PositionNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.PositionNode.prototype.constructor = v3d.PositionNode;

v3d.PositionNode.prototype.getType = function(builder) {

    switch (this.scope) {
        case v3d.PositionNode.PROJECTION:
            return 'v4';
    }

    return this.type;

};

v3d.PositionNode.prototype.isShared = function(builder) {

    switch (this.scope) {
        case v3d.PositionNode.LOCAL:
        case v3d.PositionNode.WORLD:
            return false;
    }

    return true;

};

v3d.PositionNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    switch (this.scope) {

        case v3d.PositionNode.LOCAL:

            material.requestAttribs.position = true;

            if (builder.isShader('vertex')) result = 'transformed';
            else result = 'vPosition';

            break;

        case v3d.PositionNode.WORLD:

            material.requestAttribs.worldPosition = true;

            if (builder.isShader('vertex')) result = 'vWPosition';
            else result = 'vWPosition';

            break;

        case v3d.PositionNode.VIEW:

            if (builder.isShader('vertex')) result = '-mvPosition.xyz';
            else result = 'vViewPosition';

            break;

        case v3d.PositionNode.PROJECTION:

            if (builder.isShader('vertex')) result = '(projectionMatrix * modelViewMatrix * vec4(position, 1.0))';
            else result = 'vec4(0.0)';

            break;

    }

    return builder.format(result, this.getType(builder), output);

};
