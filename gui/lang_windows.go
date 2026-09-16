//go:build windows

package main

import "syscall"

var (
    kernel32 = syscall.NewLazyDLL("kernel32.dll")
    getLang  = kernel32.NewProc("GetUserDefaultUILanguage")
)

func getSystemLanguage() string {
    // Вызываем Windows API напрямую
    ret, _, _ := getLang.Call()
    langID := uint16(ret)

    // Маска 0x3FF оставляет только primary language ID
    primary := langID & 0x3FF

    // 0x19 = LANG_RUSSIAN
    if primary == 0x19 {
        return "ru"
    }
    return "en"
}