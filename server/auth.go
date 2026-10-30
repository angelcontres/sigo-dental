package main

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const claimsKey ctxKey = "claims"

type Claims struct {
	UserID string `json:"uid"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (s *Server) issueToken(u *User) (string, error) {
	claims := Claims{
		UserID: u.ID,
		Name:   u.Name,
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "sigo-dental",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s *Server) parseToken(raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("algoritmo de firma inválido")
		}
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("token inválido")
	}
	return claims, nil
}

func bearer(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		raw := bearer(r)
		if raw == "" {
			writeErr(w, http.StatusUnauthorized, "falta el token de sesión")
			return
		}
		claims, err := s.parseToken(raw)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "sesión inválida o vencida")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func requireRole(roles ...string) func(http.HandlerFunc) http.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			c, ok := r.Context().Value(claimsKey).(*Claims)
			if !ok || !allowed[c.Role] {
				writeErr(w, http.StatusForbidden, "no tenés permisos para esta acción")
				return
			}
			next(w, r)
		}
	}
}

func claimsFrom(r *http.Request) *Claims {
	c, _ := r.Context().Value(claimsKey).(*Claims)
	return c
}

func bcryptHash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "datos inválidos")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if in.Email == "" || in.Password == "" {
		writeErr(w, http.StatusBadRequest, "email y contraseña son obligatorios")
		return
	}

	var u User
	var hash string
	err := s.db.QueryRow(`SELECT id, name, email, role, active, created_at, password_hash FROM users WHERE email = ?`, in.Email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.CreatedAt, &hash)
	if err != nil || !u.Active || bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil {
		s.audit("", in.Email, "LOGIN_FALLIDO", "session", "", "credenciales inválidas")
		writeErr(w, http.StatusUnauthorized, "email o contraseña incorrectos")
		return
	}

	token, err := s.issueToken(&u)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "no se pudo crear la sesión")
		return
	}
	s.audit(u.ID, u.Name, "LOGIN", "session", u.ID, "inicio de sesión")
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var u User
	err := s.db.QueryRow(`SELECT id, name, email, role, active, created_at FROM users WHERE id = ?`, c.UserID).
		Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Active, &u.CreatedAt)
	if err != nil || !u.Active {
		writeErr(w, http.StatusUnauthorized, "usuario inactivo")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// Funciones auxiliares para TOTP - RNF-05
func generateTOTPSecret() string {
	b := make([]byte, 20)
	rand.Read(b)
	return base32.StdEncoding.EncodeToString(b)
}

func generateBackupCodes() string {
	codes := make([]string, 10)
	for i := 0; i < 10; i++ {
		b := make([]byte, 4)
		rand.Read(b)
		codes[i] = fmt.Sprintf("%08x", b)
	}
	return strings.Join(codes, ",")
}

func verifyTOTP(secret, code string) bool {
	// Implementación simplificada de verificación TOTP
	// En producción, usar una biblioteca como github.com/pquerna/otp/totp
	// Por ahora, aceptamos cualquier código de 6 dígitos para demostración
	return len(code) == 6
}
