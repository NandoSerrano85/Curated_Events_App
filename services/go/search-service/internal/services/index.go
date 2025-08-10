package services

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strings"
	"time"

	"events-platform/services/go/search-service/internal/elasticsearch"
	"events-platform/services/go/search-service/internal/models"

	"go.uber.org/zap"
)

const (
	EventsIndex = "events"
)

type IndexService struct {
	es     *elasticsearch.Client
	logger *zap.Logger
}

func NewIndexService(es *elasticsearch.Client, logger *zap.Logger) *IndexService {
	return &IndexService{
		es:     es,
		logger: logger,
	}
}

func (s *IndexService) SetupIndices() error {
	// Check if events index exists
	exists, err := s.es.IndexExists(EventsIndex)
	if err != nil {
		return err
	}

	if !exists {
		if err := s.createEventsIndex(); err != nil {
			return err
		}
		s.logger.Info("Created events index")
	}

	return nil
}

func (s *IndexService) createEventsIndex() error {
	mapping := map[string]interface{}{
		"settings": map[string]interface{}{
			"number_of_shards":   1,
			"number_of_replicas": 1,
			"analysis": map[string]interface{}{
				"analyzer": map[string]interface{}{
					"event_analyzer": map[string]interface{}{
						"type":      "custom",
						"tokenizer": "standard",
						"filter": []string{
							"lowercase",
							"stop",
							"snowball",
						},
					},
					"autocomplete_analyzer": map[string]interface{}{
						"type":      "custom",
						"tokenizer": "keyword",
						"filter": []string{
							"lowercase",
							"edge_ngram_filter",
						},
					},
				},
				"filter": map[string]interface{}{
					"edge_ngram_filter": map[string]interface{}{
						"type":     "edge_ngram",
						"min_gram": 2,
						"max_gram": 20,
					},
				},
			},
		},
		"mappings": map[string]interface{}{
			"properties": map[string]interface{}{
				"id":                 map[string]interface{}{"type": "keyword"},
				"title": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
					"fields": map[string]interface{}{
						"keyword": map[string]interface{}{
							"type": "keyword",
						},
						"autocomplete": map[string]interface{}{
							"type":     "text",
							"analyzer": "autocomplete_analyzer",
						},
					},
				},
				"description": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
				},
				"short_description": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
				},
				"category": map[string]interface{}{
					"type": "keyword",
					"fields": map[string]interface{}{
						"text": map[string]interface{}{
							"type":     "text",
							"analyzer": "event_analyzer",
						},
					},
				},
				"tags": map[string]interface{}{
					"type": "keyword",
					"fields": map[string]interface{}{
						"text": map[string]interface{}{
							"type":     "text",
							"analyzer": "event_analyzer",
						},
					},
				},
				"organizer_id":   map[string]interface{}{"type": "keyword"},
				"organizer_name": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
					"fields": map[string]interface{}{
						"keyword": map[string]interface{}{
							"type": "keyword",
						},
					},
				},
				"venue_name": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
					"fields": map[string]interface{}{
						"keyword": map[string]interface{}{
							"type": "keyword",
						},
						"autocomplete": map[string]interface{}{
							"type":     "text",
							"analyzer": "autocomplete_analyzer",
						},
					},
				},
				"venue_address": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
				},
				"location": map[string]interface{}{
					"type": "geo_point",
				},
				"is_virtual":    map[string]interface{}{"type": "boolean"},
				"virtual_url":   map[string]interface{}{"type": "keyword"},
				"start_time":    map[string]interface{}{"type": "date"},
				"end_time":      map[string]interface{}{"type": "date"},
				"is_paid":       map[string]interface{}{"type": "boolean"},
				"price":         map[string]interface{}{"type": "double"},
				"currency":      map[string]interface{}{"type": "keyword"},
				"max_capacity":  map[string]interface{}{"type": "integer"},
				"current_capacity": map[string]interface{}{"type": "integer"},
				"images":        map[string]interface{}{"type": "keyword"},
				"status":        map[string]interface{}{"type": "keyword"},
				"is_published":  map[string]interface{}{"type": "boolean"},
				"is_featured":   map[string]interface{}{"type": "boolean"},
				"curation_score": map[string]interface{}{"type": "double"},
				"created_at":    map[string]interface{}{"type": "date"},
				"updated_at":    map[string]interface{}{"type": "date"},
				"published_at":  map[string]interface{}{"type": "date"},
				
				// Computed fields
				"price_range":      map[string]interface{}{"type": "keyword"},
				"date_range":       map[string]interface{}{"type": "keyword"},
				"available_spots":  map[string]interface{}{"type": "integer"},
				"popularity_score": map[string]interface{}{"type": "double"},
				"search_text": map[string]interface{}{
					"type":     "text",
					"analyzer": "event_analyzer",
				},
			},
		},
	}

	res, err := s.es.CreateIndex(EventsIndex, mapping)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("failed to create index: %s", string(body))
	}

	return nil
}

func (s *IndexService) IndexEvent(event *models.EventDocument) error {
	// Enhance the event document with computed fields
	s.enhanceEventDocument(event)

	eventMap := s.eventToMap(event)

	res, err := s.es.Index(EventsIndex, event.ID, eventMap)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("failed to index event: %s", string(body))
	}

	s.logger.Debug("Indexed event", zap.String("event_id", event.ID))
	return nil
}

func (s *IndexService) UpdateEvent(eventID string, updates map[string]interface{}) error {
	res, err := s.es.Update(EventsIndex, eventID, updates)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("failed to update event: %s", string(body))
	}

	s.logger.Debug("Updated event", zap.String("event_id", eventID))
	return nil
}

func (s *IndexService) DeleteEvent(eventID string) error {
	res, err := s.es.Delete(EventsIndex, eventID)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() && res.StatusCode != 404 {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("failed to delete event: %s", string(body))
	}

	s.logger.Debug("Deleted event", zap.String("event_id", eventID))
	return nil
}

func (s *IndexService) BulkIndexEvents(events []models.EventDocument) error {
	if len(events) == 0 {
		return nil
	}

	// Prepare bulk data
	documents := make([]map[string]interface{}, len(events))
	documentIDs := make([]string, len(events))

	for i, event := range events {
		s.enhanceEventDocument(&event)
		documents[i] = s.eventToMap(&event)
		documentIDs[i] = event.ID
	}

	res, err := s.es.BulkIndex(EventsIndex, documents, documentIDs)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("bulk index failed: %s", string(body))
	}

	// Parse response to check for individual errors
	var bulkResponse map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&bulkResponse); err == nil {
		if items, ok := bulkResponse["items"].([]interface{}); ok {
			errorCount := 0
			for _, item := range items {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if index, ok := itemMap["index"].(map[string]interface{}); ok {
						if status, ok := index["status"].(float64); ok && status >= 400 {
							errorCount++
							s.logger.Error("Bulk index error for document",
								zap.String("id", index["_id"].(string)),
								zap.Any("error", index["error"]))
						}
					}
				}
			}
			if errorCount > 0 {
				s.logger.Warn("Bulk index completed with errors",
					zap.Int("error_count", errorCount),
					zap.Int("total_count", len(events)))
			}
		}
	}

	s.logger.Info("Bulk indexed events", zap.Int("count", len(events)))
	return nil
}

func (s *IndexService) enhanceEventDocument(event *models.EventDocument) {
	// Calculate price range
	if event.IsPaid && event.Price != nil {
		price := *event.Price
		switch {
		case price == 0:
			event.PriceRange = "free"
		case price <= 25:
			event.PriceRange = "0-25"
		case price <= 50:
			event.PriceRange = "25-50"
		case price <= 100:
			event.PriceRange = "50-100"
		default:
			event.PriceRange = "100+"
		}
	} else {
		event.PriceRange = "free"
	}

	// Calculate date range
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.AddDate(0, 0, 1)
	thisWeekEnd := today.AddDate(0, 0, 7-int(today.Weekday()))
	thisMonthEnd := time.Date(today.Year(), today.Month()+1, 1, 0, 0, 0, 0, today.Location())

	eventStart := time.Date(event.StartTime.Year(), event.StartTime.Month(), event.StartTime.Day(), 0, 0, 0, 0, event.StartTime.Location())

	switch {
	case eventStart.Equal(today):
		event.DateRange = "today"
	case eventStart.Before(tomorrow):
		event.DateRange = "today"
	case eventStart.Before(thisWeekEnd):
		event.DateRange = "this_week"
	case eventStart.Before(thisMonthEnd):
		event.DateRange = "this_month"
	default:
		event.DateRange = "later"
	}

	// Calculate available spots
	if event.MaxCapacity != nil {
		event.AvailableSpots = *event.MaxCapacity - event.CurrentCapacity
		if event.AvailableSpots < 0 {
			event.AvailableSpots = 0
		}
	} else {
		event.AvailableSpots = 999999 // Unlimited
	}

	// Calculate popularity score (simplified)
	registrationScore := float64(event.CurrentCapacity)
	capacityScore := 0.0
	if event.MaxCapacity != nil && *event.MaxCapacity > 0 {
		capacityScore = registrationScore / float64(*event.MaxCapacity)
	}
	
	curationScore := 0.0
	if event.CurationScore != nil {
		curationScore = *event.CurationScore
	}

	// Combine scores with weights
	event.PopularityScore = (registrationScore * 0.3) + (capacityScore * 0.3) + (curationScore * 0.4)

	// Create searchable text
	searchParts := []string{
		event.Title,
		event.Description,
		event.ShortDescription,
		event.Category,
		event.OrganizerName,
		event.VenueName,
		event.VenueAddress,
	}
	searchParts = append(searchParts, event.Tags...)
	
	// Remove empty parts
	filteredParts := make([]string, 0, len(searchParts))
	for _, part := range searchParts {
		if strings.TrimSpace(part) != "" {
			filteredParts = append(filteredParts, part)
		}
	}
	
	event.SearchText = strings.Join(filteredParts, " ")
}

func (s *IndexService) eventToMap(event *models.EventDocument) map[string]interface{} {
	result := make(map[string]interface{})
	
	data, _ := json.Marshal(event)
	json.Unmarshal(data, &result)
	
	// Handle special fields
	if event.Price == nil {
		delete(result, "price")
	}
	if event.MaxCapacity == nil {
		delete(result, "max_capacity")
	}
	if event.CurationScore == nil {
		delete(result, "curation_score")
	}
	if event.PublishedAt == nil {
		delete(result, "published_at")
	}

	// Ensure numeric fields are properly typed
	if event.Price != nil && !math.IsNaN(*event.Price) {
		result["price"] = *event.Price
	}
	if event.CurationScore != nil && !math.IsNaN(*event.CurationScore) {
		result["curation_score"] = *event.CurationScore
	}
	if !math.IsNaN(event.PopularityScore) {
		result["popularity_score"] = event.PopularityScore
	}

	return result
}

func (s *IndexService) ReindexAll() error {
	// This would typically fetch events from the database and reindex them
	// For now, just recreate the index
	exists, err := s.es.IndexExists(EventsIndex)
	if err != nil {
		return err
	}

	if exists {
		if _, err := s.es.DeleteIndex(EventsIndex); err != nil {
			return err
		}
	}

	return s.createEventsIndex()
}