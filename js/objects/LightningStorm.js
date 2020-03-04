/**
 * @author yomboprime https://github.com/yomboprime
 *
 * @fileoverview Lightning strike object generator
 *
 *
 * Usage
 *
 * var myStorm = new v3d.LightningStorm(paramsObject);
 * myStorm.position.set(...);
 * scene.add(myStorm);
 * ...
 * myStorm.update(currentTime);
 *
 * The "currentTime" can only go forwards or be stopped.
 *
 *
 * LightningStorm parameters:
 *
 * @param {double} size Size of the storm. If no 'onRayPosition' parameter is defined, it means the side of the rectangle the storm covers.
 *
 * @param {double} minHeight Minimum height a ray can start at. If no 'onRayPosition' parameter is defined, it means the height above plane y = 0.
 *
 * @param {double} maxHeight Maximum height a ray can start at. If no 'onRayPosition' parameter is defined, it means the height above plane y = 0.
 *
 * @param {double} maxSlope The maximum inclination slope of a ray. If no 'onRayPosition' parameter is defined, it means the slope relative to plane y = 0.
 *
 * @param {integer} maxLightnings Greater than 0. The maximum number of simultaneous rays.
 *
 * @param {double} lightningMinPeriod minimum time between two consecutive rays.
 *
 * @param {double} lightningMaxPeriod maximum time between two consecutive rays.
 *
 * @param {double} lightningMinDuration The minimum time a ray can last.
 *
 * @param {double} lightningMaxDuration The maximum time a ray can last.
 *
 * @param {Object} lightningParameters The parameters for created rays. See v3d.LightningStrike (geometry)
 *
 * @param {Material} lightningMaterial The v3d.Material used for the created rays.
 *
 * @param {function} onRayPosition Optional callback with two Vector3 parameters (source, dest). You can set here the start and end points for each created ray, using the standard size, minHeight, etc parameters and other values in your algorithm.
 *
 * @param {function} onLightningDown This optional callback is called with one parameter (lightningStrike) when a ray ends propagating, so it has hit the ground.
 *
 *
*/

v3d.LightningStorm = function(stormParams) {

    v3d.Object3D.call(this);

    // Parameters

    stormParams = stormParams || {};
    this.stormParams = stormParams;

    stormParams.size = stormParams.size !== undefined ? stormParams.size : 1000.0;
    stormParams.minHeight = stormParams.minHeight !== undefined ? stormParams.minHeight : 80.0;
    stormParams.maxHeight = stormParams.maxHeight !== undefined ? stormParams.maxHeight : 100.0;
    stormParams.maxSlope = stormParams.maxSlope !== undefined ? stormParams.maxSlope : 1.1;

    stormParams.maxLightnings = stormParams.maxLightnings !== undefined ? stormParams.maxLightnings : 3;

    stormParams.lightningMinPeriod = stormParams.lightningMinPeriod !== undefined ? stormParams.lightningMinPeriod : 3.0;
    stormParams.lightningMaxPeriod = stormParams.lightningMaxPeriod !== undefined ? stormParams.lightningMaxPeriod : 7.0;

    stormParams.lightningMinDuration = stormParams.lightningMinDuration !== undefined ? stormParams.lightningMinDuration : 1.0;
    stormParams.lightningMaxDuration = stormParams.lightningMaxDuration !== undefined ? stormParams.lightningMaxDuration : 2.5;

    this.lightningParameters = v3d.LightningStrike.copyParameters(stormParams.lightningParameters, stormParams.lightningParameters);

    this.lightningParameters.isEternal = false;

    this.lightningMaterial = stormParams.lightningMaterial !== undefined ? stormParams.lightningMaterial : new v3d.MeshBasicMaterial({ color: 0xB0FFFF });

    if (stormParams.onRayPosition !== undefined) {

        this.onRayPosition = stormParams.onRayPosition;

    } else {

        this.onRayPosition = function(source, dest) {

            dest.set((Math.random() - 0.5) * stormParams.size, 0, (Math.random() - 0.5) * stormParams.size);

            var height = v3d.MathUtils.lerp(stormParams.minHeight, stormParams.maxHeight, Math.random());

            source.set(stormParams.maxSlope * (2 * Math.random() - 1), 1, stormParams.maxSlope * (2 * Math.random() - 1)).multiplyScalar(height).add(dest);

        };

    }

    this.onLightningDown = stormParams.onLightningDown;

    // Internal state

    this.inited = false;
    this.nextLightningTime = 0;
    this.lightningsMeshes = [];
    this.deadLightningsMeshes = [];

    for (var i = 0; i < this.stormParams.maxLightnings; i++) {

        var lightning = new v3d.LightningStrike(v3d.LightningStrike.copyParameters({}, this.lightningParameters));
        var mesh = new v3d.Mesh(lightning, this.lightningMaterial);
        this.deadLightningsMeshes.push(mesh);

    }

};

v3d.LightningStorm.prototype = Object.create(v3d.Object3D.prototype);

v3d.LightningStorm.prototype.constructor = v3d.LightningStorm;

v3d.LightningStorm.prototype.isLightningStorm = true;

v3d.LightningStorm.prototype.update = function(time) {

    if (!this.inited) {

        this.nextLightningTime = this.getNextLightningTime(time) * Math.random();
        this.inited = true;

    }

    if (time >= this.nextLightningTime) {

        // Lightning creation

        var lightningMesh = this.deadLightningsMeshes.pop();

        if (lightningMesh) {

            var lightningParams1 = v3d.LightningStrike.copyParameters(lightningMesh.geometry.rayParameters, this.lightningParameters);

            lightningParams1.birthTime = time;
            lightningParams1.deathTime = time + v3d.MathUtils.lerp(this.stormParams.lightningMinDuration, this.stormParams.lightningMaxDuration, Math.random());

            this.onRayPosition(lightningParams1.sourceOffset, lightningParams1.destOffset);

            lightningParams1.noiseSeed = Math.random();

            this.add(lightningMesh);

            this.lightningsMeshes.push(lightningMesh);

        }

        // Schedule next lightning
        this.nextLightningTime = this.getNextLightningTime(time);

    }

    var i = 0, il = this.lightningsMeshes.length;

    while (i < il) {

        var mesh = this.lightningsMeshes[i];

        var lightning = mesh.geometry;

        var prevState = lightning.state;

        lightning.update(time);

        if (prevState === v3d.LightningStrike.RAY_PROPAGATING && lightning.state > prevState) {

            if (this.onLightningDown) {

                this.onLightningDown(lightning);

            }

        }

        if (lightning.state === v3d.LightningStrike.RAY_EXTINGUISHED) {

            // Lightning is to be destroyed

            this.lightningsMeshes.splice(this.lightningsMeshes.indexOf(mesh), 1);

            this.deadLightningsMeshes.push(mesh);

            this.remove(mesh);

            il --;

        } else {

            i++;

        }

    }

};

v3d.LightningStorm.prototype.getNextLightningTime = function(currentTime) {

    return currentTime + v3d.MathUtils.lerp(this.stormParams.lightningMinPeriod, this.stormParams.lightningMaxPeriod, Math.random()) / (this.stormParams.maxLightnings + 1);

};

v3d.LightningStorm.prototype.copy = function(source) {

    v3d.Object3D.prototype.copy.call(this, source);

    this.stormParams.size = source.stormParams.size;
    this.stormParams.minHeight = source.stormParams.minHeight;
    this.stormParams.maxHeight = source.stormParams.maxHeight;
    this.stormParams.maxSlope = source.stormParams.maxSlope;

    this.stormParams.maxLightnings = source.stormParams.maxLightnings;

    this.stormParams.lightningMinPeriod = source.stormParams.lightningMinPeriod;
    this.stormParams.lightningMaxPeriod = source.stormParams.lightningMaxPeriod;

    this.stormParams.lightningMinDuration = source.stormParams.lightningMinDuration;
    this.stormParams.lightningMaxDuration = source.stormParams.lightningMaxDuration;

    this.lightningParameters = v3d.LightningStrike.copyParameters({}, source.lightningParameters);

    this.lightningMaterial = source.stormParams.lightningMaterial;

    this.onLightningDown = source.onLightningDown;

    return this;

};

v3d.LightningStrike.prototype.clone = function() {

    return new this.constructor(this.stormParams).copy(this);

};
