extends Area2D

@export var speed = 600.0
var damage_radius = 20.0

func _physics_process(delta):
	position += Vector2.UP.rotated(rotation) * speed * delta

func _on_body_entered(body):
	if body.has_method("hit"):
		body.hit(global_position, damage_radius)
		queue_free()
	elif body.name != "Player": # Don't hit self immediately if spawned inside (though mask handles this usually)
		queue_free()

func _on_visible_on_screen_notifier_2d_screen_exited():
	queue_free()

func set_difficulty(level):
	if level == 0: # Easy
		damage_radius = 40.0 # Big holes
	elif level == 1: # Medium
		damage_radius = 20.0
	else:
		damage_radius = 15.0
