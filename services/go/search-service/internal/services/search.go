package services

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"events-platform/services/go/search-service/internal/elasticsearch"
	"events-platform/services/go/search-service/internal/models"

	"go.uber.org/zap"
)

type SearchService struct {
	es     *elasticsearch.Client
	logger *zap.Logger
}

func NewSearchService(es *elasticsearch.Client, logger *zap.Logger) *SearchService {
	return &SearchService{
		es:     es,
		logger: logger,
	}
}

func (s *SearchService) SearchEvents(req *models.SimpleSearchRequest) (*models.SearchResponse, error) {
	query := s.buildSearchQuery(req)
	
	res, err := s.es.Search(EventsIndex, query)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("search failed: %s", string(body))
	}

	return s.parseSearchResponse(res.Body)
}

func (s *SearchService) AdvancedSearch(req *models.AdvancedSearchRequest) (*models.SearchResponse, error) {
	query := s.buildAdvancedSearchQuery(req)
	
	res, err := s.es.Search(EventsIndex, query)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("advanced search failed: %s", string(body))
	}

	return s.parseSearchResponse(res.Body)
}

func (s *SearchService) GetSuggestions(query string, limit int) (*models.SuggestionResponse, error) {
	if limit <= 0 {
		limit = 5
	}

	suggestionQuery := map[string]interface{}{
		"suggest": map[string]interface{}{
			"title_suggest": map[string]interface{}{
				"prefix": query,
				"completion": map[string]interface{}{
					"field": "title.autocomplete",
					"size":  limit,
				},
			},
			"venue_suggest": map[string]interface{}{
				"prefix": query,
				"completion": map[string]interface{}{
					"field": "venue_name.autocomplete",
					"size":  limit,
				},
			},
		},
		"size": 0,
	}

	res, err := s.es.Search(EventsIndex, suggestionQuery)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		body, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("suggestions failed: %s", string(body))
	}

	return s.parseSuggestionResponse(res.Body)
}

func (s *SearchService) buildSearchQuery(req *models.SimpleSearchRequest) map[string]interface{} {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []interface{}{
					map[string]interface{}{
						"term": map[string]interface{}{
							"is_published": true,
						},
					},
					map[string]interface{}{
						"term": map[string]interface{}{
							"status": "published",
						},
					},
				},
				"should": []interface{}{},
				"filter": []interface{}{},
			},
		},
		"sort": []interface{}{},
		"size": req.Size,
		"from": req.From,
	}

	boolQuery := query["query"].(map[string]interface{})["bool"].(map[string]interface{})

	// Add text search if query is provided
	if req.Query != "" {
		boolQuery["should"] = append(boolQuery["should"].([]interface{}), 
			map[string]interface{}{
				"multi_match": map[string]interface{}{
					"query":  req.Query,
					"fields": []string{
						"title^3",
						"description^2",
						"short_description^2",
						"organizer_name^1.5",
						"venue_name^1.5",
						"tags^1.2",
						"search_text",
					},
					"type": "best_fields",
					"fuzziness": "AUTO",
				},
			})
		boolQuery["minimum_should_match"] = 1
	}

	// Add filters
	filters := boolQuery["filter"].([]interface{})

	if req.Category != "" {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"category": req.Category,
			},
		})
	}

	if req.IsVirtual != nil {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"is_virtual": *req.IsVirtual,
			},
		})
	}

	if req.IsFree != nil {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"is_paid": !(*req.IsFree),
			},
		})
	}

	if req.DateRange != "" {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"date_range": req.DateRange,
			},
		})
	}

	if req.PriceRange != "" {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"price_range": req.PriceRange,
			},
		})
	}

	if len(req.Tags) > 0 {
		filters = append(filters, map[string]interface{}{
			"terms": map[string]interface{}{
				"tags": req.Tags,
			},
		})
	}

	boolQuery["filter"] = filters

	// Add sorting
	sortOrder := []interface{}{}
	
	switch req.SortBy {
	case "date":
		sortOrder = append(sortOrder, map[string]interface{}{
			"start_time": map[string]interface{}{
				"order": "asc",
			},
		})
	case "popularity":
		sortOrder = append(sortOrder, map[string]interface{}{
			"popularity_score": map[string]interface{}{
				"order": "desc",
			},
		})
	case "price":
		sortOrder = append(sortOrder, map[string]interface{}{
			"price": map[string]interface{}{
				"order":        "asc",
				"missing":      "_first",
				"unmapped_type": "double",
			},
		})
	case "relevance":
		if req.Query != "" {
			sortOrder = append(sortOrder, "_score")
		}
	default:
		// Default sort by start time
		sortOrder = append(sortOrder, map[string]interface{}{
			"start_time": map[string]interface{}{
				"order": "asc",
			},
		})
	}

	query["sort"] = sortOrder

	return query
}

func (s *SearchService) buildAdvancedSearchQuery(req *models.AdvancedSearchRequest) map[string]interface{} {
	// Convert advanced search to regular search for now
	searchReq := &models.SimpleSearchRequest{
		Query:      req.Query,
		Category:   req.Category,
		IsVirtual:  req.IsVirtual,
		IsFree:     req.IsFree,
		DateRange:  req.DateRange,
		PriceRange: req.PriceRange,
		Tags:       req.Tags,
		SortBy:     req.SortBy,
		Size:       req.Size,
		From:       req.From,
	}

	query := s.buildSearchQuery(searchReq)

	// Add advanced filters
	boolQuery := query["query"].(map[string]interface{})["bool"].(map[string]interface{})
	filters := boolQuery["filter"].([]interface{})

	if req.Location != nil && req.Location.Radius > 0 {
		filters = append(filters, map[string]interface{}{
			"geo_distance": map[string]interface{}{
				"distance": fmt.Sprintf("%.0fkm", req.Location.Radius),
				"location": map[string]interface{}{
					"lat": req.Location.Latitude,
					"lon": req.Location.Longitude,
				},
			},
		})
	}

	if req.StartDate != nil {
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"start_time": map[string]interface{}{
					"gte": req.StartDate.Format("2006-01-02T15:04:05Z"),
				},
			},
		})
	}

	if req.EndDate != nil {
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"end_time": map[string]interface{}{
					"lte": req.EndDate.Format("2006-01-02T15:04:05Z"),
				},
			},
		})
	}

	if req.MinPrice != nil {
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"price": map[string]interface{}{
					"gte": *req.MinPrice,
				},
			},
		})
	}

	if req.MaxPrice != nil {
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"price": map[string]interface{}{
					"lte": *req.MaxPrice,
				},
			},
		})
	}

	if req.HasAvailableSpots != nil && *req.HasAvailableSpots {
		filters = append(filters, map[string]interface{}{
			"range": map[string]interface{}{
				"available_spots": map[string]interface{}{
					"gt": 0,
				},
			},
		})
	}

	if req.Featured != nil {
		filters = append(filters, map[string]interface{}{
			"term": map[string]interface{}{
				"is_featured": *req.Featured,
			},
		})
	}

	boolQuery["filter"] = filters

	return query
}

func (s *SearchService) parseSearchResponse(body io.Reader) (*models.SearchResponse, error) {
	var esResponse map[string]interface{}
	if err := json.NewDecoder(body).Decode(&esResponse); err != nil {
		return nil, err
	}

	hits := esResponse["hits"].(map[string]interface{})
	total := hits["total"].(map[string]interface{})
	totalValue := int(total["value"].(float64))

	events := []models.EventSearchResult{}
	if hitArray, ok := hits["hits"].([]interface{}); ok {
		for _, hit := range hitArray {
			hitMap := hit.(map[string]interface{})
			source := hitMap["_source"].(map[string]interface{})
			
			var eventDoc models.EventDocument
			sourceBytes, _ := json.Marshal(source)
			if err := json.Unmarshal(sourceBytes, &eventDoc); err == nil {
				// Convert EventDocument to EventSearchResult
				event := models.EventSearchResult{
					ID:               eventDoc.ID,
					Title:            eventDoc.Title,
					Description:      eventDoc.Description,
					ShortDescription: eventDoc.ShortDescription,
					Category:         eventDoc.Category,
					Tags:             eventDoc.Tags,
					OrganizerID:      eventDoc.OrganizerID,
					OrganizerName:    eventDoc.OrganizerName,
					VenueName:        eventDoc.VenueName,
					VenueAddress:     eventDoc.VenueAddress,
					IsVirtual:        eventDoc.IsVirtual,
					StartTime:        eventDoc.StartTime,
					EndTime:          eventDoc.EndTime,
					IsPaid:           eventDoc.IsPaid,
					Price:            eventDoc.Price,
					Currency:         eventDoc.Currency,
					MaxCapacity:      eventDoc.MaxCapacity,
					CurrentCapacity:  eventDoc.CurrentCapacity,
					Images:           eventDoc.Images,
					IsFeatured:       eventDoc.IsFeatured,
					CurationScore:    eventDoc.CurationScore,
					CreatedAt:        eventDoc.CreatedAt,
				}
				
				// Add search score
				if score, ok := hitMap["_score"]; ok {
					event.Score = score.(float64)
				}
				
				// Calculate spots remaining
				if eventDoc.MaxCapacity != nil {
					remaining := *eventDoc.MaxCapacity - eventDoc.CurrentCapacity
					event.SpotsRemaining = &remaining
				}
				
				events = append(events, event)
			}
		}
	}

	return &models.SearchResponse{
		Events: events,
		Total:  totalValue,
		Took:   int(esResponse["took"].(float64)),
	}, nil
}

func (s *SearchService) parseSuggestionResponse(body io.Reader) (*models.SuggestionResponse, error) {
	var esResponse map[string]interface{}
	if err := json.NewDecoder(body).Decode(&esResponse); err != nil {
		return nil, err
	}

	suggestions := []string{}
	
	if suggest, ok := esResponse["suggest"]; ok {
		suggestMap := suggest.(map[string]interface{})
		
		// Parse title suggestions
		if titleSuggest, ok := suggestMap["title_suggest"]; ok {
			if titleArray, ok := titleSuggest.([]interface{}); ok && len(titleArray) > 0 {
				titleObj := titleArray[0].(map[string]interface{})
				if options, ok := titleObj["options"]; ok {
					if optionsArray, ok := options.([]interface{}); ok {
						for _, option := range optionsArray {
							optionMap := option.(map[string]interface{})
							if text, ok := optionMap["text"]; ok {
								suggestions = append(suggestions, text.(string))
							}
						}
					}
				}
			}
		}
		
		// Parse venue suggestions
		if venueSuggest, ok := suggestMap["venue_suggest"]; ok {
			if venueArray, ok := venueSuggest.([]interface{}); ok && len(venueArray) > 0 {
				venueObj := venueArray[0].(map[string]interface{})
				if options, ok := venueObj["options"]; ok {
					if optionsArray, ok := options.([]interface{}); ok {
						for _, option := range optionsArray {
							optionMap := option.(map[string]interface{})
							if text, ok := optionMap["text"]; ok {
								text := text.(string)
								// Avoid duplicates
								found := false
								for _, existing := range suggestions {
									if strings.EqualFold(existing, text) {
										found = true
										break
									}
								}
								if !found {
									suggestions = append(suggestions, text)
								}
							}
						}
					}
				}
			}
		}
	}

	return &models.SuggestionResponse{
		Suggestions: suggestions,
	}, nil
}