package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService struct {
	client *redis.Client
	ctx    context.Context
}

func initCache(redisAddr string) *CacheService {
	if strings.TrimSpace(redisAddr) == "" {
		log.Println("Redis no configurado: operando en modo directo sin caché distribuida")
		return &CacheService{client: nil, ctx: context.Background()}
	}

	opt, err := redis.ParseURL(redisAddr)
	if err != nil {
		// Intentar como host:port directo si no tiene esquema redis://
		opt = &redis.Options{
			Addr: redisAddr,
		}
	}

	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Aviso: Redis no responde en %s (%v). Modo fallback sin caché distribuida activo.", redisAddr, err)
		return &CacheService{client: nil, ctx: context.Background()}
	}

	log.Printf("Conexión exitosa a Redis en %s", opt.Addr)
	return &CacheService{client: client, ctx: context.Background()}
}

func (c *CacheService) IsActive() bool {
	return c != nil && c.client != nil
}

func (c *CacheService) Get(key string, target any) bool {
	if !c.IsActive() {
		return false
	}
	ctx, cancel := context.WithTimeout(c.ctx, 500*time.Millisecond)
	defer cancel()

	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return false
	}
	return json.Unmarshal(data, target) == nil
}

func (c *CacheService) Set(key string, value any, expiration time.Duration) {
	if !c.IsActive() {
		return
	}
	data, err := json.Marshal(value)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(c.ctx, 500*time.Millisecond)
	defer cancel()

	_ = c.client.Set(ctx, key, data, expiration).Err()
}

func (c *CacheService) Invalidate(prefixes ...string) {
	if !c.IsActive() {
		return
	}
	ctx, cancel := context.WithTimeout(c.ctx, 2*time.Second)
	defer cancel()

	for _, prefix := range prefixes {
		var cursor uint64
		for {
			keys, nextCursor, err := c.client.Scan(ctx, cursor, prefix+"*", 100).Result()
			if err != nil {
				break
			}
			if len(keys) > 0 {
				_ = c.client.Del(ctx, keys...).Err()
			}
			cursor = nextCursor
			if cursor == 0 {
				break
			}
		}
	}
}
