(function() {

    class DebugEnvironment extends v3d.Scene {

        constructor() {

            super();
            const geometry = new v3d.BoxGeometry();
            geometry.deleteAttribute('uv');
            const roomMaterial = new v3d.MeshStandardMaterial({
                metalness: 0,
                side: v3d.BackSide
            });
            const room = new v3d.Mesh(geometry, roomMaterial);
            room.scale.setScalar(10);
            this.add(room);
            const mainLight = new v3d.PointLight(0xffffff, 50, 0, 2);
            this.add(mainLight);
            const material1 = new v3d.MeshLambertMaterial({
                color: 0xff0000,
                emissive: 0xffffff,
                emissiveIntensity: 10
            });
            const light1 = new v3d.Mesh(geometry, material1);
            light1.position.set(- 5, 2, 0);
            light1.scale.set(0.1, 1, 1);
            this.add(light1);
            const material2 = new v3d.MeshLambertMaterial({
                color: 0x00ff00,
                emissive: 0xffffff,
                emissiveIntensity: 10
            });
            const light2 = new v3d.Mesh(geometry, material2);
            light2.position.set(0, 5, 0);
            light2.scale.set(1, 0.1, 1);
            this.add(light2);
            const material3 = new v3d.MeshLambertMaterial({
                color: 0x0000ff,
                emissive: 0xffffff,
                emissiveIntensity: 10
            });
            const light3 = new v3d.Mesh(geometry, material3);
            light3.position.set(2, 1, 5);
            light3.scale.set(1.5, 2, 0.1);
            this.add(light3);

        }

    }

    v3d.DebugEnvironment = DebugEnvironment;

})();
