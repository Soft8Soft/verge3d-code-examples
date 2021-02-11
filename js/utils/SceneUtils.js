v3d.SceneUtils = {

    createMeshesFromInstancedMesh: function(instancedMesh) {

        var group = new v3d.Group();

        var count = instancedMesh.count;
        var geometry = instancedMesh.geometry;
        var material = instancedMesh.material;

        for (var i = 0; i < count; i++) {

            var mesh = new v3d.Mesh(geometry, material);

            instancedMesh.getMatrixAt(i, mesh.matrix);
            mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);

            group.add(mesh);

        }

        group.copy(instancedMesh);
        group.updateMatrixWorld(); // ensure correct world matrices of meshes

        return group;

    },

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
