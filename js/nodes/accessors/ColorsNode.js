/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ColorsNode = function(index) {

    v3d.TempNode.call(this, 'v4', { shared: false });

    this.index = index || 0;

};

v3d.ColorsNode.vertexDict = ['color', 'color2'];
v3d.ColorsNode.fragmentDict = ['vColor', 'vColor2'];

v3d.ColorsNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.ColorsNode.prototype.constructor = v3d.ColorsNode;

v3d.ColorsNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    material.requestAttribs.color[this.index] = true;

    if (builder.isShader('vertex')) result = v3d.ColorsNode.vertexDict[this.index];
    else result = v3d.ColorsNode.fragmentDict[this.index];

    return builder.format(result, this.getType(builder), output);

};
