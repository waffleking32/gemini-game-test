extends CharacterBody2D

@export var rotation_speed = 3.5
@export var thrust_speed = 400.0
@export var friction = 2.0
@export var bullet_scene: PackedScene

@onready var muzzle = $Muzzle

var difficulty_fire_rate_multiplier = 1.0
var can_shoot = true
var current_difficulty = 0

func _physics_process(delta):
	var rotation_dir = Input.get_axis("ui_left", "ui_right")
	rotation += rotation_dir * rotation_speed * delta
	
	if Input.is_action_pressed("ui_up"):
		velocity += Vector2.UP.rotated(rotation) * thrust_speed * delta
	
	# Simple friction
	velocity = velocity.move_toward(Vector2.ZERO, friction * delta * 100) # simpler damping
	
	move_and_slide()
	
	if Input.is_action_pressed("ui_accept") and can_shoot:
		shoot()

func shoot():
	if not bullet_scene:
		return
		
	can_shoot = false
	var b = bullet_scene.instantiate()
	b.global_position = muzzle.global_position
	b.rotation = rotation
	# Pass difficulty to bullet
	if b.has_method("set_difficulty"):
		b.set_difficulty(current_difficulty)
	get_tree().root.add_child(b)
	
	var cooldown = 0.2 / difficulty_fire_rate_multiplier
	await get_tree().create_timer(cooldown).timeout
	can_shoot = true

func set_difficulty(level):
	current_difficulty = level
	if level == 0: # Easy
		difficulty_fire_rate_multiplier = 2.0 # Fast fire
	elif level == 1: # Medium
		difficulty_fire_rate_multiplier = 1.0
	else: # Hard
		difficulty_fire_rate_multiplier = 0.8
