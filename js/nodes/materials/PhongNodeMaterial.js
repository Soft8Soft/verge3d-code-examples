/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.PhongNodeMaterial = function() {

    this.node = new v3d.PhongNode();

    v3d.NodeMaterial.call(this, this.node, this.node);

};

v3d.PhongNodeMaterial.prototype = Object.create(v3d.NodeMaterial.prototype);
v3d.PhongNodeMaterial.prototype.constructor = v3d.PhongNodeMaterial;

v3d.NodeMaterial.addShortcuts(v3d.PhongNodeMaterial.prototype, 'node',
['color', 'alpha', 'specular', 'shininess', 'normal', 'normalScale', 'emissive', 'ambient', 'light', 'shadow', 'ao', 'environment', 'environmentAlpha', 'transform']);
