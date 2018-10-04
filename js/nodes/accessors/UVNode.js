/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.UVNode = function(index) {

    v3d.TempNode.call(this, 'v2', { shared: false });

    this.index = index || 0;

};

v3d.UVNode.vertexDict = ['uv', 'uv2'];
v3d.UVNode.fragmentDict = ['vUv', 'vUv2'];

v3d.UVNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.UVNode.prototype.constructor = v3d.UVNode;

v3d.UVNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    material.requestAttribs.uv[this.index] = true;

    if (builder.isShader('vertex')) result = v3d.UVNode.vertexDict[this.index];
    else result = v3d.UVNode.fragmentDict[this.index];

    return builder.format(result, this.getType(builder), output);

};
