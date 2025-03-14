# **Smart Contract Overview**

The contracts are structured to handle artifact tokenization, event organization, exhibit ticketing, and revenue distribution. Below is a high-level interaction diagram and function descriptions.

---

### **Contract Interaction Diagram**

```plaintext
EventOrganizerService
├──► ArtifactNFT        - Manages digital tokens representing artifacts.
├──► ExhibitNFT         - Manages tickets and allocations for exhibits.
├──► PaymentHandler     - Handles ticket payments and revenue distribution.
└──► Museum             - Organizes exhibits and manages artifact indexing.

ArtifactNFT
└──► Museum             - Artifacts are indexed under museums.

Museum
├──► ExhibitNFT         - Requests ticket minting for exhibitions.
└──► PaymentHandler     - Distributes revenue from exhibit ticket sales.

ExhibitNFT
└──► PaymentHandler     - Handles ticket sales and revenue distribution.

PaymentHandler
└──► Beneficiaries      - Distributes collected revenue based on predefined shares.
```
### **One-Line Contract Descriptions**

1. **`ArtifactNFT.sol`** – Manages the minting and ownership of artifact-based NFTs, linking them to museums for indexing and provenance tracking.

2. **`EventOrganizerService.sol`** – Facilitates the creation and organization of exhibits by deploying `ArtifactNFT` and `ExhibitNFT` contracts while managing event structuring and revenue distribution.

3. **`ExhibitNFT.sol`** – Handles the minting of exhibit tickets as NFTs, ensuring secure access control for event participants and linking ticket sales to the payment handler.

4. **`Museum.sol`** – Acts as a central registry for exhibits, curating `ExhibitNFT` instances and verifying ticket ownership for museum-organized events.

5. **`PaymentHandler.sol`** – Manages ticket sales, processes payments in ERC-20 tokens, and distributes revenue to predefined beneficiaries based on assigned shares.

## Development Tools and Scripts 🚀

The development environment utilizes Hardhat, with specific commands tailored for compiling, testing, deploying, and managing the smart contracts on the Sepolia network. The provided scripts ensure a streamlined workflow for developers:

```json
"scripts": {
  "test": "REPORT

_GAS=true hardhat test",
  "test:coverage": "hardhat coverage --solcoverjs ./.solcover.js --temp build/contracts --testfiles \"./test/*.ts\"",
  "build": "hardhat compile",
  "deploy:dev": "hardhat run --network sepolia scripts/deploy.ts",
  "configure:dev": "hardhat run --network sepolia scripts/configure.ts",
  "mock:dev": "hardhat run --network sepolia scripts/mock.ts"
}
```

## Gas Report (Sepolia)

The following Hardhat test report provides insights into the gas efficiency of key contract functions. It reflects the results under Solc version 0.8.20 with optimization enabled. 

For additional information please see contract [coverage](https://github.com/bicos-io01/Revenue-Sharing-Source/tree/Central/packages/contracts/coverage).
If contract coverage or any part of this readme is not up to date with latest RVS-m create an issue with a PR to update coverage and send an email to [**info@summitshare.co**](mailto:info@summitshare.co) with *'Documentation Update!* in the subject.


```
.. code-block:: shell

  ·-------------------------------------------------|---------------------------|-------------|-----------------------------·
  |              Solc version: 0.8.20               ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
  ··················································|···························|·············|······························
  |  Methods                                        ·              100 gwei/gas               ·       1890.62 usd/eth       │
  ··························|·······················|·············|·············|·············|···············|··············
  |  Contract               ·  Method               ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  ArtifactNFT            ·  mint                 ·          -  ·          -  ·     101933  ·            2  ·      19.27  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  EventOrganizerService  ·  deployArtifactNFT    ·          -  ·          -  ·    1071093  ·            2  ·     202.50  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  EventOrganizerService  ·  organizeExhibit      ·    2040046  ·    2129702  ·    2070104  ·            9  ·     391.38  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  ExhibitNFT             ·  mintTicket           ·          -  ·          -  ·      96906  ·           10  ·      18.32  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  ExhibitNFT             ·  setBaseURI           ·          -  ·          -  ·      57678  ·            1  ·      10.90  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  Museum                 ·  transferOwnership    ·      28613  ·      28625  ·      28621  ·            3  ·       5.41  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  PaymentHandler         ·  processPayment       ·     118780  ·     219761  ·     185584  ·           19  ·      35.09  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  PaymentHandler         ·  setTicketingEnabled  ·      29375  ·      46487  ·      44584  ·            9  ·       8.43  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  USDT                   ·  approve              ·      46335  ·      46347  ·      46345  ·           12  ·       8.76  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  USDT                   ·  transfer             ·      51584  ·      51608  ·      51592  ·            3  ·       9.75  │
  ··························|·······················|·············|·············|·············|···············|··············
  |  Deployments                                    ·                                         ·  % of limit   ·             │
  ··················································|·············|·············|·············|···············|··············
  |  ArtifactNFT                                    ·    1146268  ·    1190927  ·    1151870  ·        3.8 %  ·     217.77  │
  ··················································|·············|·············|·············|···············|··············
  |  EventOrganizerService                          ·    4302935  ·    4302947  ·    4302943  ·       14.3 %  ·     813.52  │
  ··················································|·············|·············|·············|···············|··············
  |  ExhibitNFT                                     ·    1419117  ·    1486339  ·    1452728  ·        4.8 %  ·     274.66  │
  ··················································|·············|·············|·············|···············|··············
  |  Museum                                         ·          -  ·          -  ·     379851  ·        1.3 %  ·      71.82  │
  ··················································|·············|·············|·············|···············|··············
  |  PaymentHandler                                 ·     712095  ·     758788  ·     735442  ·        2.5 %  ·     139.04  │
  ··················································|·············|·············|·············|···············|··············
  |  USDT                                           ·     553622  ·     553646  ·     553627  ·        1.8 %  ·     104.67  │
  ·-------------------------------------------------|-------------|-------------|-------------|---------------|-------------·

  40 passing (3s)

```