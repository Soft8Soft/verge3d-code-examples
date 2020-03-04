/**
 * @author alteredq / http://alteredqualia.com/
 */

v3d.MorphAnimMesh = function(geometry, material) {

    v3d.Mesh.call(this, geometry, material);

    this.type = 'MorphAnimMesh';

    this.mixer = new v3d.AnimationMixer(this);
    this.activeAction = null;

};

v3d.MorphAnimMesh.prototype = Object.create(v3d.Mesh.prototype);
v3d.MorphAnimMesh.prototype.constructor = v3d.MorphAnimMesh;

v3d.MorphAnimMesh.prototype.setDirectionForward = function() {

    this.mixer.timeScale = 1.0;

};

v3d.MorphAnimMesh.prototype.setDirectionBackward = function() {

    this.mixer.timeScale = - 1.0;

};

v3d.MorphAnimMesh.prototype.playAnimation = function(label, fps) {

    if (this.activeAction) {

        this.activeAction.stop();
        this.activeAction = null;

    }

    var clip = v3d.AnimationClip.findByName(this, label);

    if (clip) {

        var action = this.mixer.clipAction(clip);
        action.timeScale = (clip.tracks.length * fps) / clip.duration;
        this.activeAction = action.play();

    } else {

        throw new Error('v3d.MorphAnimMesh: animations[' + label + '] undefined in .playAnimation()');

    }

};

v3d.MorphAnimMesh.prototype.updateAnimation = function(delta) {

    this.mixer.update(delta);

};

v3d.MorphAnimMesh.prototype.copy = function(source) {

    v3d.Mesh.prototype.copy.call(this, source);

    this.mixer = new v3d.AnimationMixer(this);

    return this;

};
