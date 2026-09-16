//go:build !windows

package main

import (
    "os"
    "strings"
)

func getSystemLanguage() string {
    for _, key := range []string{"LANG", "LC_ALL", "LC_MESSAGES"} {
        if v := os.Getenv(key); v != "" {
            if strings.HasPrefix(v, "ru") {
                return "ru"
            }
            if strings.HasPrefix(v, "en") {
                return "en"
            }
        }
    }
    return "en"
}