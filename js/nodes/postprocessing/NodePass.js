/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.NodePass = function() {

    v3d.ShaderPass.call(this);

    this.textureID = 'renderTexture';

    this.fragment = new v3d.RawNode(new v3d.ScreenNode());

    this.node = new v3d.NodeMaterial();
    this.node.fragment = this.fragment;

    this.build();

};

v3d.NodePass.prototype = Object.create(v3d.ShaderPass.prototype);
v3d.NodePass.prototype.constructor = v3d.NodePass;

v3d.NodeMaterial.addShortcuts(v3d.NodePass.prototype, 'fragment', ['value']);

v3d.NodePass.prototype.build = function() {

    this.node.build();

    this.uniforms = this.node.uniforms;
    this.material = this.node;

};
