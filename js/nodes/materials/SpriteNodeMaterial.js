/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.SpriteNodeMaterial = function() {

    this.node = new v3d.SpriteNode();

    v3d.NodeMaterial.call(this, this.node, this.node);

};

v3d.SpriteNodeMaterial.prototype = Object.create(v3d.NodeMaterial.prototype);
v3d.SpriteNodeMaterial.prototype.constructor = v3d.SpriteNodeMaterial;

v3d.NodeMaterial.addShortcuts(v3d.SpriteNodeMaterial.prototype, 'node',
['color', 'alpha', 'transform', 'spherical']);
