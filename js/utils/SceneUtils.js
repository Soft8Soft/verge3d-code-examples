/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.SceneUtils = {

    createMultiMaterialObject: function(geometry, materials) {

        var group = new v3d.Group();

        for (var i = 0, l = materials.length; i < l; i++) {

            group.add(new v3d.Mesh(geometry, materials[i]));

        }

        return group;

    },

    detach: function(child, parent, scene) {

        console.warn('v3d.SceneUtils: detach() has been deprecated. Use scene.attach(child) instead.');

        scene.attach(child);

    },

    attach: function(child, scene, parent) {

        console.warn('v3d.SceneUtils: attach() has been deprecated. Use parent.attach(child) instead.');

        parent.attach(child);

    }

};
