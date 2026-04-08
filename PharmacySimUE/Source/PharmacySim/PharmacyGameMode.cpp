#include "PharmacyGameMode.h"
#include "PharmacyPlayerController.h"
#include "PharmacySim.h"

APharmacyGameMode::APharmacyGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	PlayerControllerClass = APharmacyPlayerController::StaticClass();
	bScenarioActive = false;
	ScenarioTimer = 0.f;
	ScenarioScore = 0;
}

void APharmacyGameMode::BeginPlay()
{
	Super::BeginPlay();
	UE_LOG(LogPharmacySim, Log, TEXT("PharmacyGameMode initialized. Ready for scenarios."));
}

void APharmacyGameMode::StartScenario(const FString& ScenarioId)
{
	CurrentScenarioId = ScenarioId;
	bScenarioActive = true;
	ScenarioTimer = 0.f;
	ScenarioScore = 0;

	OnScenarioStarted.Broadcast(ScenarioId);
	UE_LOG(LogPharmacySim, Log, TEXT("Scenario started: %s"), *ScenarioId);
}

void APharmacyGameMode::EndScenario()
{
	if (!bScenarioActive) return;

	bScenarioActive = false;
	OnScenarioEnded.Broadcast(CurrentScenarioId, ScenarioScore);
	UE_LOG(LogPharmacySim, Log, TEXT("Scenario ended: %s | Score: %d | Time: %.1fs"),
		*CurrentScenarioId, ScenarioScore, ScenarioTimer);
}

void APharmacyGameMode::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (bScenarioActive)
	{
		ScenarioTimer += DeltaTime;
	}
}
