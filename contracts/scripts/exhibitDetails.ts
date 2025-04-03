import { ethers } from "hardhat";

// Deployment structs types
export interface RevenueConfig {
    beneficiaries: string[];
    shares: number[];
  }

  export interface ExhibitInfo {
    name: string;
    symbol: string;
    ticketPrice: bigint;
    baseURI: string;
    artifactNFTAddress: string;
}

// Deployment data objects
  export const getRevenueConfig = (): RevenueConfig => {
      const beneficiary1: string = "0xA259489699DA3296ac0211e83A5c7cB5FeB3E33f";
      const beneficiary2: string = "0x6E95E4a97efb1FaDE341Cd867F07101C7b997151";
      
      return {
          beneficiaries: [beneficiary1, beneficiary2],
          shares: [80, 20]
      };
  };

  export const getContractAddress = {
    museumAddress : "0xFACFeFf860bCd2507e70d88e85e78Ccb64f6e0a6",
    organizerServiceAddress : "0x9C9811d9b560d13D1159508632A67d405075FB2b",
    artifactNFT1 : "0x169123FFB4fd3E5B8d11613eE84c54FCEaA5C2Dc",
    exhibitId : "TS2",
 }

      // Create ExhibitInfo struct
     export const getExhibitInfo: ExhibitInfo = {
          name: "Test Exhibit",
          symbol: "TS2",
          ticketPrice: ethers.parseUnits("5", 6),
          baseURI: "https://s3.tebi.io/summitshare-tickets/",
          artifactNFTAddress: getContractAddress.artifactNFT1
      };

      export const getAddInfo = {
        location : "Virtual Space",
        details : "Join us as we reclaim and create new history."
      }
 

    export const artifact1 = {
        name: "Exhibit v2",
        symbol: "TS1",
        baseURI: "https://s3.tebi.io/summitshare-uris/",
      }