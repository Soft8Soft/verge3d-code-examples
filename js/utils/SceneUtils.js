(function() {

    class SceneUtils {

        static createMeshesFromInstancedMesh(instancedMesh) {

            const group = new v3d.Group();
            const count = instancedMesh.count;
            const geometry = instancedMesh.geometry;
            const material = instancedMesh.material;

            for (let i = 0; i < count; i++) {

                const mesh = new v3d.Mesh(geometry, material);
                instancedMesh.getMatrixAt(i, mesh.matrix);
                mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
                group.add(mesh);

            }

            group.copy(instancedMesh);
            group.updateMatrixWorld(); // ensure correct world matrices of meshes

            return group;

        }

        static createMultiMaterialObject(geometry, materials) {

            const group = new v3d.Group();

            for (let i = 0, l = materials.length; i < l; i++) {

                group.add(new v3d.Mesh(geometry, materials[i]));

            }

            return group;

        }

        static detach(child, parent, scene) {

            console.warn('v3d.SceneUtils: detach() has been deprecated. Use scene.attach(child) instead.');
            scene.attach(child);

        }

        static attach(child, scene, parent) {

            console.warn('v3d.SceneUtils: attach() has been deprecated. Use parent.attach(child) instead.');
            parent.attach(child);

        }

    }

    v3d.SceneUtils = SceneUtils;

})();
