/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.StandardNodeMaterial = function() {

    this.node = new v3d.StandardNode();

    v3d.NodeMaterial.call(this, this.node, this.node);

};

v3d.StandardNodeMaterial.prototype = Object.create(v3d.NodeMaterial.prototype);
v3d.StandardNodeMaterial.prototype.constructor = v3d.StandardNodeMaterial;

v3d.NodeMaterial.addShortcuts(v3d.StandardNodeMaterial.prototype, 'node',
['color', 'alpha', 'roughness', 'metalness', 'reflectivity', 'clearCoat', 'clearCoatRoughness', 'normal', 'normalScale', 'emissive', 'ambient', 'light', 'shadow', 'ao', 'environment', 'transform']);
