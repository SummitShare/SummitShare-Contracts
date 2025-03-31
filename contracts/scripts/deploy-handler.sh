#!/bin/bash

# This script deploys the PaymentHandler contract to specified networks
# Usage: ./deploy-handler.sh [dev|prod] network1 network2 ...
# Example: ./deploy-handler.sh dev base optimism
# Example: ./deploy-handler.sh prod mainnet polygon

# Check if at least two arguments are provided
if [ $# -lt 2 ]; then
  echo "Usage: $0 [dev|prod] network1 network2 ..."
  echo "Example: $0 dev base optimism"
  exit 1
fi

# Get environment (dev or prod)
ENV=$1
shift

# Get networks from remaining arguments
NETWORKS=("$@")

echo "Deploying PaymentHandler to ${#NETWORKS[@]} networks in $ENV environment:"
for network in "${NETWORKS[@]}"; do
  echo "- $network"
done

# Map network names to their Hardhat configuration names
for network in "${NETWORKS[@]}"; do
  HARDHAT_NETWORK=""
  
  if [ "$ENV" == "dev" ]; then
    case $network in
      "sepolia") HARDHAT_NETWORK="sepolia" ;;
      "optimism") HARDHAT_NETWORK="optimismSepolia" ;;
      "base") HARDHAT_NETWORK="baseSepolia" ;;
      "polygon") HARDHAT_NETWORK="polygonMumbai" ;;
      *) 
        echo "Unknown development network: $network"
        echo "Supported networks: sepolia, optimism, base, polygon"
        continue
        ;;
    esac
  elif [ "$ENV" == "prod" ]; then
    case $network in
      "mainnet") HARDHAT_NETWORK="mainnet" ;;
      "optimism") HARDHAT_NETWORK="optimism" ;;
      "base") HARDHAT_NETWORK="base" ;;
      "polygon") HARDHAT_NETWORK="polygon" ;;
      *) 
        echo "Unknown production network: $network"
        echo "Supported networks: mainnet, optimism, base, polygon"
        continue
        ;;
    esac
  else
    echo "Unknown environment: $ENV"
    echo "Supported environments: dev, prod"
    exit 1
  fi
  
  if [ -n "$HARDHAT_NETWORK" ]; then
    echo "Deploying to $network ($HARDHAT_NETWORK)..."
    npx hardhat run --network $HARDHAT_NETWORK scripts/deployHandler.ts
    
    if [ $? -ne 0 ]; then
      echo "Deployment to $network failed!"
    else
      echo "Deployment to $network completed successfully!"
    fi
    echo "----------------------------------------"
  fi
done

echo "All deployments completed!"
