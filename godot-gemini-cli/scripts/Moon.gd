extends StaticBody2D

signal moon_destroyed

@onready var polygon_2d = $Polygon2D
@onready var collision_polygon_2d = $CollisionPolygon2D

var total_area = 0.0
var initial_area = 0.0
var destroyed_threshold = 0.05 # 5% remaining counts as destroyed

func _ready():
	# Initialize the moon as a circle
	var points = PackedVector2Array()
	var radius = 150.0
	var segments = 64
	for i in range(segments):
		var angle = i * TAU / segments
		points.append(Vector2(cos(angle), sin(angle)) * radius)
	
	polygon_2d.polygon = points
	collision_polygon_2d.polygon = points
	initial_area = _calculate_area(points)
	total_area = initial_area

func hit(hit_global_position, clip_radius):
	# Convert global hit position to local
	var local_pos = to_local(hit_global_position)
	
	# Create the clipping circle
	var clip_points = PackedVector2Array()
	var segments = 16
	for i in range(segments):
		var angle = i * TAU / segments
		clip_points.append(local_pos + Vector2(cos(angle), sin(angle)) * clip_radius)
	
	# Perform the clip
	var current_polygons = _get_polygons()
	var new_polygons = []
	
	for poly in current_polygons:
		var result = Geometry2D.clip_polygons(poly, clip_points)
		new_polygons.append_array(result)
	
	_update_polygons(new_polygons)
	_spawn_debris(hit_global_position, clip_radius)
	_check_destroyed()

func _get_polygons():
	# In a complex scenario, we might track multiple polygons. 
	# For simplicity, if we have multiple islands, we might need a more complex structure,
	# but for now let's assume we rebuild from the visual polygon or children.
	# Actually, Geometry2D returns an array of polygons (arrays of points).
	# We need to support multiple distinct shapes if the moon splits.
	
	# If we haven't split yet, it's just one. If we have, we might have multiple CollisionPolygon2D children.
	# Let's verify how we store state.
	
	# Simplification: We will strictly use the children CollisionPolygon2Ds as the source of truth.
	var polys = []
	
	# If we have the initial one
	if collision_polygon_2d.polygon.size() > 0:
		polys.append(collision_polygon_2d.polygon)
	
	for child in get_children():
		if child is CollisionPolygon2D and child != collision_polygon_2d:
			polys.append(child.polygon)
			
	return polys

func _update_polygons(new_polygons):
	# Clear existing physics shapes and visual
	collision_polygon_2d.polygon = PackedVector2Array() # Clear primary
	
	# Remove extra children from previous splits
	for child in get_children():
		if child is CollisionPolygon2D and child != collision_polygon_2d:
			child.queue_free()
	
	# Rebuild
	polygon_2d.polygons = [] # This is for the visual mapping if we were using bones, but Polygon2D draws one main poly usually. 
	# Wait, Polygon2D draws ONE polygon. If it splits, we need multiple Polygon2D nodes or use the 'polygons' property if it supports holes (it does, but disconnected islands need distinct nodes usually or careful indexing).
	# Actually, Polygon2D *can* draw multiple disjoint polygons if we don't assume they are connected, but standard usage is one.
	# EASIER APPROACH: Just instantiate new child nodes for islands?
	# OR: Just keep one main node for the largest chunk and delete small ones?
	# No, splitting is fun.
	
	# Let's stick to: One Polygon2D can handle holes, but not easily multiple islands unless we use the internal vertices/polygons indices.
	# Alternative: We just instantiate a new StaticBody or child Polygon2D for every island.
	# Let's keep it simple: We will use the Main Polygon2D for the first shape, and spawn new Polygon2D children for others.
	
	# CLEANER: Remove ALL collision/visual children and rebuild from scratch.
	
	# 1. Clear visuals
	polygon_2d.polygon = PackedVector2Array()
	
	# 2. Rebuild
	total_area = 0.0
	
	# We need to manage the nodes. Let's create a helper to clear dynamically created children.
	for child in get_children():
		if child.has_meta("dynamic_chunk"):
			child.queue_free()
	
	# We might have 0 polys left
	if new_polygons.is_empty():
		total_area = 0
		return

	# Assign first poly to the main nodes
	if new_polygons.size() > 0:
		polygon_2d.polygon = new_polygons[0]
		collision_polygon_2d.polygon = new_polygons[0]
		total_area += _calculate_area(new_polygons[0])
		
	# Handle additional islands
	for i in range(1, new_polygons.size()):
		var poly_points = new_polygons[i]
		total_area += _calculate_area(poly_points)
		
		# Create visual
		var new_poly_vis = Polygon2D.new()
		new_poly_vis.polygon = poly_points
		new_poly_vis.color = polygon_2d.color
		new_poly_vis.set_meta("dynamic_chunk", true)
		add_child(new_poly_vis)
		
		# Create collider
		var new_collider = CollisionPolygon2D.new()
		new_collider.polygon = poly_points
		new_collider.set_meta("dynamic_chunk", true)
		add_child(new_collider)

func _spawn_debris(pos, radius):
	# Visual only - simple particles or small rigid bodies
	pass 

func _calculate_area(points):
	var area = 0.0
	for i in range(points.size()):
		var j = (i + 1) % points.size()
		area += points[i].cross(points[j])
	return abs(area / 2.0)

func _check_destroyed():
	if total_area < initial_area * destroyed_threshold:
		emit_signal("moon_destroyed")
		queue_free()
