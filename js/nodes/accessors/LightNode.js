/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.LightNode = function() {

    v3d.TempNode.call(this, 'v3', { shared: false });

};

v3d.LightNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.LightNode.prototype.constructor = v3d.LightNode;

v3d.LightNode.prototype.generate = function(builder, output) {

    if (builder.isCache('light')) {

        return builder.format('reflectedLight.directDiffuse', this.getType(builder), output)

    } else {

        console.warn("v3d.LightNode is only compatible in \"light\" channel.");

        return builder.format('vec3(0.0)', this.getType(builder), output);

    }

};
