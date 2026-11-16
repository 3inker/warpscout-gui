package warpscout

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"io"
	"math/bits"
	"net"
	"strings"
	"time"
)

var telegramDCs = []string{
	"149.154.175.50:443",  // DC1
	"149.154.167.51:443",  // DC2
	"149.154.175.100:443", // DC3
	"149.154.167.91:443",  // DC4
	"91.108.56.130:443",   // DC5
}

type dialFunc func(ctx context.Context, addr string) (net.Conn, error)

var allDCs = uint8(1<<len(telegramDCs)) - 1

func reachedDCs(ctx context.Context, dial dialFunc, addrs []string, timeout time.Duration) (rtt time.Duration, reached uint8) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	type result struct {
		i   int
		rtt time.Duration
		ok  bool
	}
	res := make(chan result, len(addrs))
	for i, addr := range addrs {
		go func(i int, addr string) {
			start := time.Now()
			conn, err := dial(ctx, addr)
			if err != nil {
				res <- result{i: i}
				return
			}
			conn.Close()
			res <- result{i, time.Since(start), true}
		}(i, addr)
	}

	for range addrs {
		r := <-res
		if r.ok {
			reached |= 1 << r.i
			rtt = max(rtt, r.rtt)
		}
	}
	return rtt, reached
}

func tgPartialStr(reached uint8) string {
	if reached == 0 {
		return "blocked"
	}
	return fmt.Sprintf("%d/%d", bits.OnesCount8(reached), len(telegramDCs))
}

func dcNames(mask uint8) string {
	var names []string
	for i := range telegramDCs {
		if mask&(1<<i) != 0 {
			names = append(names, fmt.Sprintf("DC%d", i+1))
		}
	}
	return strings.Join(names, ", ")
}

func mtprotoProbe(ctx context.Context, conn net.Conn) error {
	if d, ok := ctx.Deadline(); ok {
		conn.SetDeadline(d)
		defer conn.SetDeadline(time.Time{})
	}

	msg := make([]byte, 0, 4+4+40)
	msg = append(msg, 0xee, 0xee, 0xee, 0xee)
	msg = binary.LittleEndian.AppendUint32(msg, 40)
	msg = append(msg, make([]byte, 8)...)
	msg = binary.LittleEndian.AppendUint64(msg, uint64(time.Now().Unix())<<32)
	msg = binary.LittleEndian.AppendUint32(msg, 20)
	msg = binary.LittleEndian.AppendUint32(msg, 0xbe7e8ef1)
	var nonce [16]byte
	rand.Read(nonce[:])
	msg = append(msg, nonce[:]...)

	if _, err := conn.Write(msg); err != nil {
		return err
	}
	var hdr [4]byte
	if _, err := io.ReadFull(conn, hdr[:]); err != nil {
		return err
	}
	n := binary.LittleEndian.Uint32(hdr[:])
	if n < resPQMin || n > 1<<16 {
		return fmt.Errorf("mtproto: implausible frame length %d", n)
	}
	body := make([]byte, n)
	if _, err := io.ReadFull(conn, body); err != nil {
		return err
	}
	if id := binary.LittleEndian.Uint64(body[:8]); id != 0 {
		return fmt.Errorf("mtproto: answer carries auth_key_id %#x, want a plaintext one", id)
	}
	if l := binary.LittleEndian.Uint32(body[16:20]); l < 4+16 || 20+int(l) > len(body) {
		return fmt.Errorf("mtproto: message_data_length %d does not fit a %d-byte frame", l, n)
	}
	if c := binary.LittleEndian.Uint32(body[20:24]); c != 0x05162463 {
		return fmt.Errorf("mtproto: answer constructor %#x, want res_pq", c)
	}
	if !bytes.Equal(body[24:40], nonce[:]) {
		return fmt.Errorf("mtproto: answer does not echo our nonce")
	}
	return nil
}

const resPQMin = 8 + 8 + 4 + 4 + 16

// telegramRTT добавляется к твоей структуре ipStack из tunnel.go
func (s *ipStack) telegramRTT(ctx context.Context, timeout time.Duration) (rtt time.Duration, reached uint8) {
	return reachedDCs(ctx, func(ctx context.Context, addr string) (net.Conn, error) {
		// Используем TUN-стек для дозвона
		conn, err := s.tnet.DialContext(ctx, "tcp", addr)
		if err != nil {
			return nil, err
		}
		if err := mtprotoProbe(ctx, conn); err != nil {
			conn.Close()
			return nil, err
		}
		return conn, nil
	}, telegramDCs, timeout)
}