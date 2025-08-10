-- Sample event categories for development
INSERT INTO event_categories (id, name, slug, description, icon, color, sort_order, is_active) VALUES
(uuid_generate_v4(), 'Technology', 'technology', 'Technology conferences, workshops, and meetups', 'laptop', '#007bff', 1, true),
(uuid_generate_v4(), 'Business', 'business', 'Business networking, entrepreneurship, and professional development', 'briefcase', '#28a745', 2, true),
(uuid_generate_v4(), 'Arts & Culture', 'arts-culture', 'Art exhibitions, cultural events, and creative workshops', 'palette', '#dc3545', 3, true),
(uuid_generate_v4(), 'Music', 'music', 'Concerts, music festivals, and musical performances', 'music', '#fd7e14', 4, true),
(uuid_generate_v4(), 'Sports & Fitness', 'sports-fitness', 'Sports events, fitness classes, and outdoor activities', 'dumbbell', '#20c997', 5, true),
(uuid_generate_v4(), 'Food & Drink', 'food-drink', 'Food festivals, wine tastings, and culinary experiences', 'utensils', '#6f42c1', 6, true),
(uuid_generate_v4(), 'Education', 'education', 'Educational workshops, seminars, and learning opportunities', 'graduation-cap', '#e83e8c', 7, true),
(uuid_generate_v4(), 'Health & Wellness', 'health-wellness', 'Health workshops, wellness retreats, and medical conferences', 'heart', '#17a2b8', 8, true),
(uuid_generate_v4(), 'Entertainment', 'entertainment', 'Comedy shows, theater, and general entertainment events', 'masks-theater', '#ffc107', 9, true),
(uuid_generate_v4(), 'Networking', 'networking', 'Professional networking events and social meetups', 'users', '#6c757d', 10, true),
(uuid_generate_v4(), 'Charity & Fundraising', 'charity-fundraising', 'Charity events, fundraisers, and volunteer opportunities', 'hand-holding-heart', '#198754', 11, true),
(uuid_generate_v4(), 'Travel & Outdoor', 'travel-outdoor', 'Travel meetups, outdoor adventures, and exploration events', 'map-marked-alt', '#0d6efd', 12, true)
ON CONFLICT (name) DO NOTHING;