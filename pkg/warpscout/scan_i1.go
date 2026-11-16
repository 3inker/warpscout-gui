package warpscout

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"

	"github.com/vernette/warpscout/core"
)

const scanI1Threshold = 50

func scanWithI1(ctx context.Context, automatic bool, sink core.EventSink, scan func() (phaseResult, error)) (phaseResult, error) {
	if !automatic {
		return scan()
	}
	candidates := findJunkI1Candidates("")
	ports := slices.Clone(warpPorts)
	var lastErr error
	var best phaseResult
	var bestI1 i1Candidate
	var bestPorts []int
	var bestOuter *nest
	bestWorking, bestIndex := 0, 0
	defer func() {
		if bestOuter != nil {
			bestOuter.tunnel.Close()
		}
	}()
	for index, candidate := range candidates {
		if err := ctx.Err(); err != nil {
			return phaseResult{}, err
		}
		awgI1 = candidate.chain
		genI1Label = fmt.Sprintf("%d/%d %s", index+1, len(candidates), candidate.label)
		warpPorts = slices.Clone(ports)
		emitProgress(sink, core.OperationScan, "awg-i1", index+1, len(candidates), "")
		ph, err := scan()
		if ctx.Err() != nil {
			return phaseResult{}, ctx.Err()
		}
		if err != nil {
			lastErr = err
			continue
		}
		score := scoreJunk(ph)
		if score.meets(scanI1Threshold) {
			return ph, nil
		}
		if score.working > bestWorking {
			best, bestI1 = ph, candidate
			bestWorking, bestIndex = score.working, index+1
			bestPorts = slices.Clone(warpPorts)
			if bestOuter != nil {
				bestOuter.tunnel.Close()
			}
			bestOuter, outer = outer, nil
		}
		lastErr = fmt.Errorf("%d/%d working tunnels", score.working, score.total)
	}
	if bestWorking > 0 {
		awgI1, genI1Label = bestI1.chain, bestI1.label
		warpPorts = bestPorts
		if outer != nil {
			outer.tunnel.Close()
		}
		outer, bestOuter = bestOuter, nil
		if sink != nil {
			payload, _ := json.Marshal(map[string]int{
				"attempt":  bestIndex,
				"working":  bestWorking,
				"tornDown": len(tornSorted(best.results)),
			})
			sink(core.ProgressEvent{
				Operation: core.OperationScan, Type: "progress", Phase: "awg-i1-selected",
				Completed: len(best.results), Total: len(best.results), Payload: payload,
			})
		}
		return best, nil
	}
	return phaseResult{}, fmt.Errorf("no working tunnels found with any of the %d I1 profiles: %w", len(candidates), lastErr)
}