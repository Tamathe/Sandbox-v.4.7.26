#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "PharmacyGameMode.generated.h"

/**
 * Core game mode for the Pharmacy Counter Simulation.
 * Manages scenario lifecycle, scoring, and AI patient spawning.
 */
UCLASS()
class PHARMACYSIM_API APharmacyGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	APharmacyGameMode();

	virtual void BeginPlay() override;

	// Start a new patient scenario
	UFUNCTION(BlueprintCallable, Category = "Pharmacy")
	void StartScenario(const FString& ScenarioId);

	// End the current scenario and submit score
	UFUNCTION(BlueprintCallable, Category = "Pharmacy")
	void EndScenario();

	// Current scenario state
	UPROPERTY(BlueprintReadOnly, Category = "Pharmacy")
	FString CurrentScenarioId;

	UPROPERTY(BlueprintReadOnly, Category = "Pharmacy")
	bool bScenarioActive;

	UPROPERTY(BlueprintReadOnly, Category = "Pharmacy")
	float ScenarioTimer;

	UPROPERTY(BlueprintReadOnly, Category = "Pharmacy")
	int32 ScenarioScore;

	// Scenario events
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnScenarioStarted, const FString&, ScenarioId);
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnScenarioEnded, const FString&, ScenarioId, int32, FinalScore);

	UPROPERTY(BlueprintAssignable, Category = "Pharmacy")
	FOnScenarioStarted OnScenarioStarted;

	UPROPERTY(BlueprintAssignable, Category = "Pharmacy")
	FOnScenarioEnded OnScenarioEnded;

protected:
	virtual void Tick(float DeltaTime) override;
};
