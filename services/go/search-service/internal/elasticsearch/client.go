package elasticsearch

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
	"go.uber.org/zap"
)

type Client struct {
	es     *elasticsearch.Client
	logger *zap.Logger
}

func NewClient(urls string, logger *zap.Logger) (*Client, error) {
	cfg := elasticsearch.Config{
		Addresses: strings.Split(urls, ","),
		Transport: &http.Transport{
			MaxIdleConnsPerHost:   10,
			ResponseHeaderTimeout: 10 * time.Second,
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
		MaxRetries:    3,
		RetryOnStatus: []int{502, 503, 504, 429},
		RetryBackoff: func(i int) time.Duration {
			return time.Duration(i) * 100 * time.Millisecond
		},
	}

	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, err
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := es.Info(es.Info.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, err
	}

	logger.Info("Connected to Elasticsearch")
	
	return &Client{
		es:     es,
		logger: logger,
	}, nil
}

func (c *Client) Search(index string, query map[string]interface{}) (*esapi.Response, error) {
	return c.es.Search(
		c.es.Search.WithContext(context.Background()),
		c.es.Search.WithIndex(index),
		c.es.Search.WithBody(strings.NewReader(c.mapToJSON(query))),
		c.es.Search.WithTrackTotalHits(true),
		c.es.Search.WithPretty(),
	)
}

func (c *Client) Index(index, documentID string, body map[string]interface{}) (*esapi.Response, error) {
	return c.es.Index(
		index,
		strings.NewReader(c.mapToJSON(body)),
		c.es.Index.WithDocumentID(documentID),
		c.es.Index.WithContext(context.Background()),
		c.es.Index.WithRefresh("true"),
	)
}

func (c *Client) Update(index, documentID string, body map[string]interface{}) (*esapi.Response, error) {
	updateBody := map[string]interface{}{
		"doc": body,
	}

	return c.es.Update(
		index,
		documentID,
		strings.NewReader(c.mapToJSON(updateBody)),
		c.es.Update.WithContext(context.Background()),
		c.es.Update.WithRefresh("true"),
	)
}

func (c *Client) Delete(index, documentID string) (*esapi.Response, error) {
	return c.es.Delete(
		index,
		documentID,
		c.es.Delete.WithContext(context.Background()),
		c.es.Delete.WithRefresh("true"),
	)
}

func (c *Client) BulkIndex(index string, documents []map[string]interface{}, documentIDs []string) (*esapi.Response, error) {
	var body strings.Builder
	
	for i, doc := range documents {
		// Index action
		action := map[string]interface{}{
			"index": map[string]interface{}{
				"_index": index,
				"_id":    documentIDs[i],
			},
		}
		body.WriteString(c.mapToJSON(action) + "\n")
		
		// Document
		body.WriteString(c.mapToJSON(doc) + "\n")
	}

	return c.es.Bulk(
		strings.NewReader(body.String()),
		c.es.Bulk.WithContext(context.Background()),
		c.es.Bulk.WithRefresh("true"),
	)
}

func (c *Client) CreateIndex(name string, mapping map[string]interface{}) (*esapi.Response, error) {
	return c.es.Indices.Create(
		name,
		c.es.Indices.Create.WithBody(strings.NewReader(c.mapToJSON(mapping))),
		c.es.Indices.Create.WithContext(context.Background()),
	)
}

func (c *Client) IndexExists(name string) (bool, error) {
	res, err := c.es.Indices.Exists(
		[]string{name},
		c.es.Indices.Exists.WithContext(context.Background()),
	)
	if err != nil {
		return false, err
	}
	defer res.Body.Close()
	
	return res.StatusCode == 200, nil
}

func (c *Client) DeleteIndex(name string) (*esapi.Response, error) {
	return c.es.Indices.Delete(
		[]string{name},
		c.es.Indices.Delete.WithContext(context.Background()),
	)
}

func (c *Client) Suggest(index string, query map[string]interface{}) (*esapi.Response, error) {
	return c.es.Search(
		c.es.Search.WithContext(context.Background()),
		c.es.Search.WithIndex(index),
		c.es.Search.WithBody(strings.NewReader(c.mapToJSON(query))),
		c.es.Search.WithSize(0), // Only suggestions, no documents
	)
}

func (c *Client) mapToJSON(data map[string]interface{}) string {
	// Use proper JSON marshaling
	bytes, err := json.Marshal(data)
	if err != nil {
		c.logger.Error("Failed to marshal JSON", zap.Error(err))
		return "{}"
	}
	return string(bytes)
}